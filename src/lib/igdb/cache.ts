// Game caching logic - fetch from DB first, fallback to IGDB
import { prisma } from "../../db";
import {
	buildCoverUrl,
	getGameById,
	getGameBySlug,
	type IGDBGame,
	searchGames,
} from "./client";

// Cache TTL in milliseconds (7 days)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface CachedGame {
	id: string;
	igdbId: number;
	name: string;
	slug: string;
	summary: string | null;
	coverUrl: string | null;
	releaseDate: Date | null;
	genres: string[];
	platforms: string[];
	rating: number | null;
	cachedAt: Date;
	updatedAt: Date;
}

function igdbToDbGame(igdbGame: IGDBGame) {
	return {
		igdbId: igdbGame.id,
		name: igdbGame.name,
		slug: igdbGame.slug,
		summary: igdbGame.summary || null,
		coverUrl: igdbGame.cover
			? buildCoverUrl(igdbGame.cover.image_id, "cover_big")
			: null,
		releaseDate: igdbGame.first_release_date
			? new Date(igdbGame.first_release_date * 1000)
			: null,
		genres: igdbGame.genres?.map((g) => g.name) || [],
		platforms: igdbGame.platforms?.map((p) => p.name) || [],
		rating: igdbGame.rating || null,
	};
}

function isCacheStale(cachedAt: Date): boolean {
	return Date.now() - cachedAt.getTime() > CACHE_TTL;
}

export async function getCachedGameByIgdbId(
	igdbId: number,
): Promise<CachedGame | null> {
	// Try to get from database first
	let game = await prisma.game.findUnique({
		where: { igdbId },
	});

	// If not in cache or stale, fetch from IGDB
	if (!game || isCacheStale(game.cachedAt)) {
		const igdbGame = await getGameById(igdbId);
		if (!igdbGame) return null;

		const gameData = igdbToDbGame(igdbGame);

		game = await prisma.game.upsert({
			where: { igdbId },
			update: { ...gameData, cachedAt: new Date() },
			create: gameData,
		});
	}

	return game;
}

export async function getCachedGameBySlug(
	slug: string,
): Promise<CachedGame | null> {
	// Try to get from database first
	let game = await prisma.game.findFirst({
		where: { slug },
	});

	// If not in cache or stale, fetch from IGDB
	if (!game || isCacheStale(game.cachedAt)) {
		const igdbGame = await getGameBySlug(slug);
		if (!igdbGame) return null;

		const gameData = igdbToDbGame(igdbGame);

		game = await prisma.game.upsert({
			where: { igdbId: igdbGame.id },
			update: { ...gameData, cachedAt: new Date() },
			create: gameData,
		});
	}

	return game;
}

export async function searchAndCacheGames(
	query: string,
	limit = 10,
): Promise<CachedGame[]> {
	// Search IGDB
	const igdbGames = await searchGames(query, limit);

	// Cache all results
	const cachedGames = await Promise.all(
		igdbGames.map(async (igdbGame) => {
			const gameData = igdbToDbGame(igdbGame);

			return prisma.game.upsert({
				where: { igdbId: igdbGame.id },
				update: { ...gameData, cachedAt: new Date() },
				create: gameData,
			});
		}),
	);

	return cachedGames;
}

export async function refreshStaleGames(limit = 50): Promise<number> {
	const staleDate = new Date(Date.now() - CACHE_TTL);

	const staleGames = await prisma.game.findMany({
		where: {
			cachedAt: { lt: staleDate },
		},
		take: limit,
	});

	let refreshed = 0;
	for (const game of staleGames) {
		try {
			const igdbGame = await getGameById(game.igdbId);
			if (igdbGame) {
				const gameData = igdbToDbGame(igdbGame);
				await prisma.game.update({
					where: { id: game.id },
					data: { ...gameData, cachedAt: new Date() },
				});
				refreshed++;
			}
		} catch (err) {
			console.error(`Failed to refresh game ${game.igdbId}:`, err);
		}
	}

	return refreshed;
}

export type { CachedGame };
