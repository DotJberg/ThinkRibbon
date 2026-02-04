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
	category?: number; // 0=Main, 1=DLC, 2=Expansion, 3=Bundle, 4=Standalone Expansion, etc.
	version_parent?: number; // If set, this is an edition/variant of another game
	parent_game?: number; // If set, this is DLC/expansion of another game
}

// IGDB category values
const IGDB_CATEGORY = {
	MAIN_GAME: 0,
	DLC: 1,
	EXPANSION: 2,
	BUNDLE: 3,
	STANDALONE_EXPANSION: 4,
	MOD: 5,
	EPISODE: 6,
	SEASON: 7,
	REMAKE: 8,
	REMASTER: 9,
	EXPANDED_GAME: 10,
	PORT: 11,
	FORK: 12,
	PACK: 13,
	UPDATE: 14,
} as const;

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

function getCategoryLabel(category: number | undefined): string | undefined {
	switch (category) {
		case IGDB_CATEGORY.DLC:
			return "DLC";
		case IGDB_CATEGORY.EXPANSION:
			return "Expansion";
		case IGDB_CATEGORY.BUNDLE:
			return "Bundle";
		case IGDB_CATEGORY.STANDALONE_EXPANSION:
			return "Standalone DLC";
		case IGDB_CATEGORY.MOD:
			return "Mod";
		case IGDB_CATEGORY.EPISODE:
			return "Episode";
		case IGDB_CATEGORY.SEASON:
			return "Season";
		case IGDB_CATEGORY.REMAKE:
			return "Remake";
		case IGDB_CATEGORY.REMASTER:
			return "Remaster";
		case IGDB_CATEGORY.EXPANDED_GAME:
			return "Expanded Edition";
		case IGDB_CATEGORY.PORT:
			return "Port";
		case IGDB_CATEGORY.PACK:
			return "Pack";
		case IGDB_CATEGORY.UPDATE:
			return "Update";
		default:
			return undefined; // Main game or unknown
	}
}

function igdbToGameData(igdbGame: IGDBGame) {
	// Determine category label - use parent_game as fallback for DLC detection
	let categoryLabel = getCategoryLabel(igdbGame.category);
	if (!categoryLabel && igdbGame.parent_game) {
		categoryLabel = "DLC"; // Has a parent game = DLC or expansion
	}

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
		// Fetch more results to account for filtering
		const fetchLimit = searchLimit * 3;

		// Step 1: Search to get game IDs (IGDB search doesn't return all fields)
		const searchQuery = `
			search "${args.query}";
			fields id;
			limit ${fetchLimit};
		`;

		const searchResults = await igdbRequest<Array<{ id: number }>>(
			"games",
			searchQuery,
		);

		if (searchResults.length === 0) {
			return [];
		}

		// Step 2: Fetch full details for found games
		const gameIds = searchResults.map((g) => g.id).join(",");
		const detailsQuery = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating, category, version_parent, parent_game;
			where id = (${gameIds});
			limit ${fetchLimit};
		`;

		let igdbGames = await igdbRequest<IGDBGame[]>("games", detailsQuery);

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

		// Sort by release date
		igdbGames.sort((a, b) => {
			const dateA = a.first_release_date ?? Number.MAX_SAFE_INTEGER;
			const dateB = b.first_release_date ?? Number.MAX_SAFE_INTEGER;
			return dateA - dateB;
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
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating, category, parent_game;
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
