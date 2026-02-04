import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

interface TwitchToken {
	access_token: string;
	expires_in: number;
	token_type: string;
}

interface IGDBGame {
	id: number;
	name: string;
	slug: string;
	summary?: string;
	cover?: { id: number; image_id: string };
	first_release_date?: number;
	genres?: { id: number; name: string }[];
	platforms?: { id: number; name: string }[];
	rating?: number;
	game_type?: { id: number; type: string }; // Main Game, DLC, Expansion, etc.
	version_parent?: number; // If set, this is an edition/variant of another game
}

// In-memory token cache (per action invocation; short-lived)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTwitchToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
		return cachedToken.token;
	}

	const clientId = process.env.TWITCH_CLIENT_ID;
	const clientSecret = process.env.TWITCH_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set");
	}

	const response = await fetch("https://id.twitch.tv/oauth2/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "client_credentials",
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to get Twitch token: ${response.statusText}`);
	}

	const data: TwitchToken = await response.json();
	cachedToken = {
		token: data.access_token,
		expiresAt: Date.now() + data.expires_in * 1000,
	};
	return data.access_token;
}

async function igdbRequest<T>(endpoint: string, query: string): Promise<T> {
	const token = await getTwitchToken();
	const clientId = process.env.TWITCH_CLIENT_ID!;

	// Clean up query - remove extra whitespace/tabs
	const cleanQuery = query
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join(" ");

	const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
		method: "POST",
		headers: {
			"Client-ID": clientId,
			Authorization: `Bearer ${token}`,
			"Content-Type": "text/plain",
		},
		body: cleanQuery,
	});

	if (!response.ok) {
		throw new Error(`IGDB request failed: ${response.statusText}`);
	}

	return response.json();
}

function buildCoverUrl(
	imageId: string,
	size: "cover_small" | "cover_big" | "720p" | "1080p" = "cover_big",
): string {
	return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

// Calculate relevance score for a game name against search query
// Higher score = better match
function calculateRelevanceScore(gameName: string, query: string): number {
	const name = gameName.toLowerCase();
	const q = query.toLowerCase();

	// Exact match
	if (name === q) return 1000;

	// Name starts with query (e.g., "The Finals" starts with "the finals")
	if (name.startsWith(q)) return 900;

	// Query is the full name with subtitle (e.g., "The Finals: Season 1")
	if (name.startsWith(q + ":") || name.startsWith(q + " -")) return 850;

	// Name contains query as a complete phrase
	if (name.includes(q)) return 800;

	// All query words appear in name in order
	const queryWords = q.split(/\s+/);
	const nameWords = name.split(/\s+/);
	let lastIndex = -1;
	let allInOrder = true;
	for (const qw of queryWords) {
		const idx = nameWords.findIndex((nw, i) => i > lastIndex && nw.startsWith(qw));
		if (idx === -1) {
			allInOrder = false;
			break;
		}
		lastIndex = idx;
	}
	if (allInOrder) return 700;

	// Fallback: count matching words
	const matchingWords = queryWords.filter((qw) =>
		nameWords.some((nw) => nw.includes(qw)),
	).length;
	return matchingWords * 100;
}

function igdbToGameData(igdbGame: IGDBGame) {
	// Use game_type.type directly - only show label for non-main games
	const categoryLabel =
		igdbGame.game_type?.type && igdbGame.game_type.type !== "Main Game"
			? igdbGame.game_type.type
			: undefined;

	return {
		igdbId: igdbGame.id,
		name: igdbGame.name,
		slug: igdbGame.slug,
		summary: igdbGame.summary || undefined,
		coverUrl: igdbGame.cover
			? buildCoverUrl(igdbGame.cover.image_id, "cover_big")
			: undefined,
		releaseDate: igdbGame.first_release_date
			? igdbGame.first_release_date * 1000
			: undefined,
		genres: igdbGame.genres?.map((g) => g.name) || [],
		platforms: igdbGame.platforms?.map((p) => p.name) || [],
		rating: igdbGame.rating || undefined,
		categoryLabel,
	};
}

export const searchAndCache = action({
	args: { query: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const searchLimit = args.limit || 10;
		// Fetch more results to account for filtering and to find better matches
		// IGDB search often buries exact matches under popular franchises
		const fetchLimit = Math.max(searchLimit * 5, 50);

		// Step 1a: Name-based search for exact/prefix matches (IGDB search often buries these)
		const nameQuery = `
			fields id;
			where name ~ *"${args.query}"*;
			limit ${fetchLimit};
		`;

		const nameResults = await igdbRequest<Array<{ id: number }>>(
			"games",
			nameQuery,
		).catch(() => [] as Array<{ id: number }>);

		// Step 1b: Fuzzy search to get additional results
		const searchQuery = `
			search "${args.query}";
			fields id;
			limit ${fetchLimit};
		`;

		const fuzzyResults = await igdbRequest<Array<{ id: number }>>(
			"games",
			searchQuery,
		);

		// Combine results, prioritizing name matches (dedupe by id)
		const seenIds = new Set<number>();
		const searchResults: Array<{ id: number }> = [];
		for (const r of [...nameResults, ...fuzzyResults]) {
			if (!seenIds.has(r.id)) {
				seenIds.add(r.id);
				searchResults.push(r);
			}
		}


		if (searchResults.length === 0) {
			return [];
		}

		// Step 2: Fetch full details for found games
		const gameIds = searchResults.map((g) => g.id).join(",");
		const detailsQuery = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating, game_type.type, version_parent;
			where id = (${gameIds});
			limit ${fetchLimit};
		`;

		let igdbGames = await igdbRequest<IGDBGame[]>("games", detailsQuery);

		// Sort by relevance score (prioritize exact/close name matches over IGDB's popularity-biased results)
		igdbGames.sort((a, b) => {
			const scoreA = calculateRelevanceScore(a.name, args.query);
			const scoreB = calculateRelevanceScore(b.name, args.query);
			return scoreB - scoreA;
		});

		// Filter out:
		// 1. Edition variants (have version_parent) - Collector's Edition, Deluxe Edition, etc.
		// 2. Mods and fan games (check by name pattern and other signals)
		igdbGames = igdbGames.filter((game) => {
			// Filter out editions (version_parent means it's a variant of another game)
			if (game.version_parent) return false;

			// Filter out likely mods/fan games by name patterns
			const lowerName = game.name.toLowerCase();
			const modPatterns = [
				"reforged",
				"randomizer",
				"convergence",
				"ascended",
				"dark moon",
				" mod",
				"demake",
				" gb", // Game Boy demakes like "Elden Ring GB"
				" nes",
				" snes",
				"(fan",
				"fan game",
				"fan-made",
			];
			if (modPatterns.some((pattern) => lowerName.includes(pattern))) {
				return false;
			}

			// Filter out games without platforms (often indicates unofficial/fan content)
			if (!game.platforms || game.platforms.length === 0) {
				return false;
			}

			return true;
		});

		// Limit to requested amount
		igdbGames = igdbGames.slice(0, searchLimit);

		// Cache all results via internal mutation
		const results = [];
		for (const igdbGame of igdbGames) {
			const gameData = igdbToGameData(igdbGame);
			const id: Id<"games"> = await ctx.runMutation(
				internal.games.upsertFromIgdb,
				{
					igdbId: gameData.igdbId,
					name: gameData.name,
					slug: gameData.slug,
					summary: gameData.summary,
					coverUrl: gameData.coverUrl,
					releaseDate: gameData.releaseDate,
					genres: gameData.genres,
					platforms: gameData.platforms,
					rating: gameData.rating,
					categoryLabel: gameData.categoryLabel,
				},
			);
			results.push({ _id: id, ...gameData });
		}

		return results;
	},
});

export const fetchBySlug = action({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const query = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating, game_type.type;
			where slug = "${args.slug}";
			limit 1;
		`;

		const igdbGames = await igdbRequest<IGDBGame[]>("games", query);
		if (igdbGames.length === 0) return null;

		const gameData = igdbToGameData(igdbGames[0]);
		const id: Id<"games"> = await ctx.runMutation(
			internal.games.upsertFromIgdb,
			{
				igdbId: gameData.igdbId,
				name: gameData.name,
				slug: gameData.slug,
				summary: gameData.summary,
				coverUrl: gameData.coverUrl,
				releaseDate: gameData.releaseDate,
				genres: gameData.genres,
				platforms: gameData.platforms,
				rating: gameData.rating,
				categoryLabel: gameData.categoryLabel,
			},
		);
		return { _id: id, ...gameData };
	},
});

export const fetchPopular = action({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const fetchLimit = args.limit || 20;
		const query = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
			where rating > 70 & cover != null;
			sort rating desc;
			limit ${fetchLimit};
		`;

		const igdbGames = await igdbRequest<IGDBGame[]>("games", query);

		const results = [];
		for (const igdbGame of igdbGames) {
			const gameData = igdbToGameData(igdbGame);
			const id: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdb, gameData);
			results.push({ _id: id, ...gameData });
		}

		return results;
	},
});

export const fetchRecent = action({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const fetchLimit = args.limit || 20;
		const now = Math.floor(Date.now() / 1000);
		const oneYearAgo = now - 365 * 24 * 60 * 60;

		const query = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
			where first_release_date > ${oneYearAgo} & first_release_date < ${now} & cover != null;
			sort first_release_date desc;
			limit ${fetchLimit};
		`;

		const igdbGames = await igdbRequest<IGDBGame[]>("games", query);

		const results = [];
		for (const igdbGame of igdbGames) {
			const gameData = igdbToGameData(igdbGame);
			const id: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdb, gameData);
			results.push({ _id: id, ...gameData });
		}

		return results;
	},
});

export const fetchUpcoming = action({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const fetchLimit = args.limit || 100;
		const now = Math.floor(Date.now() / 1000);
		// Fetch games releasing in the next 12 months
		const oneYearFromNow = now + 365 * 24 * 60 * 60;

		const query = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating, game_type.type, version_parent, hypes;
			where first_release_date > ${now} & first_release_date < ${oneYearFromNow} & cover != null & platforms != null & version_parent = null & hypes > 0;
			sort hypes desc;
			limit ${fetchLimit};
		`;

		let igdbGames = await igdbRequest<(IGDBGame & { hypes?: number })[]>(
			"games",
			query,
		);

		// Filter out mods/fan games
		igdbGames = igdbGames.filter((game) => {
			const lowerName = game.name.toLowerCase();
			const modPatterns = [
				"reforged",
				"randomizer",
				"convergence",
				"ascended",
				"dark moon",
				" mod",
				"demake",
				" gb",
				" nes",
				" snes",
				"(fan",
				"fan game",
				"fan-made",
			];
			return !modPatterns.some((pattern) => lowerName.includes(pattern));
		});

		const results = [];
		for (const igdbGame of igdbGames) {
			const gameData = {
				...igdbToGameData(igdbGame),
				hypes: igdbGame.hypes || 0,
			};
			const id: Id<"games"> = await ctx.runMutation(
				internal.games.upsertFromIgdb,
				{
					igdbId: gameData.igdbId,
					name: gameData.name,
					slug: gameData.slug,
					summary: gameData.summary,
					coverUrl: gameData.coverUrl,
					releaseDate: gameData.releaseDate,
					genres: gameData.genres,
					platforms: gameData.platforms,
					rating: gameData.rating,
					categoryLabel: gameData.categoryLabel,
					hypes: gameData.hypes,
				},
			);
			results.push({ _id: id, ...gameData });
		}

		return results;
	},
});

export const fetchUpcomingByMonth = action({
	args: {
		year: v.number(),
		month: v.number(), // 1-12
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const fetchLimit = args.limit || 20;
		const offset = args.offset || 0;

		// Calculate month start and end timestamps
		const monthStart = new Date(args.year, args.month - 1, 1);
		const monthEnd = new Date(args.year, args.month, 0, 23, 59, 59);

		const startTimestamp = Math.floor(monthStart.getTime() / 1000);
		const endTimestamp = Math.floor(monthEnd.getTime() / 1000);

		const query = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating, game_type.type, version_parent, hypes;
			where first_release_date >= ${startTimestamp} & first_release_date <= ${endTimestamp} & cover != null & platforms != null & version_parent = null;
			sort hypes desc;
			limit ${fetchLimit};
			offset ${offset};
		`;

		let igdbGames = await igdbRequest<(IGDBGame & { hypes?: number })[]>(
			"games",
			query,
		);

		// Filter out mods/fan games
		igdbGames = igdbGames.filter((game) => {
			const lowerName = game.name.toLowerCase();
			const modPatterns = [
				"reforged",
				"randomizer",
				"convergence",
				"ascended",
				"dark moon",
				" mod",
				"demake",
				" gb",
				" nes",
				" snes",
				"(fan",
				"fan game",
				"fan-made",
			];
			return !modPatterns.some((pattern) => lowerName.includes(pattern));
		});

		const results = [];
		for (const igdbGame of igdbGames) {
			const gameData = {
				...igdbToGameData(igdbGame),
				hypes: igdbGame.hypes || 0,
			};
			const id: Id<"games"> = await ctx.runMutation(
				internal.games.upsertFromIgdb,
				{
					igdbId: gameData.igdbId,
					name: gameData.name,
					slug: gameData.slug,
					summary: gameData.summary,
					coverUrl: gameData.coverUrl,
					releaseDate: gameData.releaseDate,
					genres: gameData.genres,
					platforms: gameData.platforms,
					rating: gameData.rating,
					categoryLabel: gameData.categoryLabel,
					hypes: gameData.hypes,
				},
			);
			results.push({ _id: id, ...gameData });
		}

		return results;
	},
});
