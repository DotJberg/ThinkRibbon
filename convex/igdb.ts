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

	const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
		method: "POST",
		headers: {
			"Client-ID": clientId,
			Authorization: `Bearer ${token}`,
			"Content-Type": "text/plain",
		},
		body: query,
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

function igdbToGameData(igdbGame: IGDBGame) {
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
	};
}

export const searchAndCache = action({
	args: { query: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const searchLimit = args.limit || 10;
		const query = `
			search "${args.query}";
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
			where version_parent = null;
			limit ${searchLimit};
		`;

		const igdbGames = await igdbRequest<IGDBGame[]>("games", query);

		// Cache all results via internal mutation
		const results = [];
		for (const igdbGame of igdbGames) {
			const gameData = igdbToGameData(igdbGame);
			const id: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdb, gameData);
			results.push({ _id: id, ...gameData });
		}

		return results;
	},
});

export const fetchBySlug = action({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const query = `
			fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
			where slug = "${args.slug}";
			limit 1;
		`;

		const igdbGames = await igdbRequest<IGDBGame[]>("games", query);
		if (igdbGames.length === 0) return null;

		const gameData = igdbToGameData(igdbGames[0]);
		const id: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdb, gameData);
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
