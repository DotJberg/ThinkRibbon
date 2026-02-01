// Server functions for games
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import {
	buildCoverUrl,
	getCachedGameBySlug,
	getPopularGames,
	getRecentGames,
	refreshStaleGames,
	searchAndCacheGames,
} from "../igdb";

// Search games (searches IGDB and caches results)
export const searchGames = createServerFn({
	method: "GET",
})
	.inputValidator((data: { query: string; limit?: number }) => data)
	.handler(async ({ data }) => {
		return searchAndCacheGames(data.query, data.limit || 10);
	});

// Get game by slug
export const getGameBySlug = createServerFn({
	method: "GET",
})
	.inputValidator((slug: string) => slug)
	.handler(async ({ data: slug }) => {
		return getCachedGameBySlug(slug);
	});

// Get games from database with reviews
export const getGamesWithReviews = createServerFn({
	method: "GET",
})
	.inputValidator((data: { cursor?: string; limit?: number }) => data)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		const games = await prisma.game.findMany({
			where: {
				reviews: { some: { published: true } },
			},
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { updatedAt: "desc" },
			include: {
				_count: { select: { reviews: { where: { published: true } } } },
			},
		});

		let nextCursor: string | undefined;
		if (games.length > limit) {
			const nextItem = games.pop();
			nextCursor = nextItem?.id;
		}

		// Get average ratings
		const gamesWithRatings = await Promise.all(
			games.map(async (game) => {
				const avg = await prisma.review.aggregate({
					where: { gameId: game.id, published: true },
					_avg: { rating: true },
				});
				return {
					...game,
					averageRating: avg._avg.rating || 0,
				};
			}),
		);

		return { games: gamesWithRatings, nextCursor };
	});

// Get highest rated games on the site (sorted by average review rating)
export const getHighestRatedGames = createServerFn({
	method: "GET",
})
	.inputValidator((data: { cursor?: string; limit?: number }) => data)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		// Get all games with at least one published review
		const games = await prisma.game.findMany({
			where: {
				reviews: { some: { published: true } },
			},
			include: {
				_count: { select: { reviews: { where: { published: true } } } },
			},
		});

		// Calculate average ratings for all games
		const gamesWithRatings = await Promise.all(
			games.map(async (game) => {
				const avg = await prisma.review.aggregate({
					where: { gameId: game.id, published: true },
					_avg: { rating: true },
				});
				return {
					...game,
					averageRating: avg._avg.rating || 0,
				};
			}),
		);

		// Sort by average rating descending
		gamesWithRatings.sort((a, b) => b.averageRating - a.averageRating);

		// Apply cursor-based pagination
		let startIndex = 0;
		if (data.cursor) {
			const cursorIndex = gamesWithRatings.findIndex(
				(g) => g.id === data.cursor,
			);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const paginatedGames = gamesWithRatings.slice(
			startIndex,
			startIndex + limit + 1,
		);
		let nextCursor: string | undefined;
		if (paginatedGames.length > limit) {
			const nextItem = paginatedGames.pop();
			nextCursor = nextItem?.id;
		}

		return { games: paginatedGames, nextCursor };
	});

// Get popular games from IGDB
export const fetchPopularGames = createServerFn({
	method: "GET",
})
	.inputValidator((limit: number | undefined) => limit)
	.handler(async ({ data: limit }) => {
		const igdbGames = await getPopularGames(limit || 20);

		// Cache all results
		const cachedGames = await Promise.all(
			igdbGames.map(async (igdbGame) => {
				const gameData = {
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
					genres: igdbGame.genres?.map((g: { name: string }) => g.name) || [],
					platforms:
						igdbGame.platforms?.map((p: { name: string }) => p.name) || [],
					rating: igdbGame.rating || null,
				};

				return prisma.game.upsert({
					where: { igdbId: igdbGame.id },
					update: { ...gameData, cachedAt: new Date() },
					create: gameData,
				});
			}),
		);

		return cachedGames;
	});

// Get recent games from IGDB
export const fetchRecentGames = createServerFn({
	method: "GET",
})
	.inputValidator((limit: number | undefined) => limit)
	.handler(async ({ data: limit }) => {
		const igdbGames = await getRecentGames(limit || 20);

		// Cache all results
		const cachedGames = await Promise.all(
			igdbGames.map(async (igdbGame) => {
				const gameData = {
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
					genres: igdbGame.genres?.map((g: { name: string }) => g.name) || [],
					platforms:
						igdbGame.platforms?.map((p: { name: string }) => p.name) || [],
					rating: igdbGame.rating || null,
				};

				return prisma.game.upsert({
					where: { igdbId: igdbGame.id },
					update: { ...gameData, cachedAt: new Date() },
					create: gameData,
				});
			}),
		);

		return cachedGames;
	});

// Refresh stale game cache
export const refreshGameCache = createServerFn({
	method: "POST",
})
	.inputValidator((limit: number | undefined) => limit)
	.handler(async ({ data: limit }) => {
		const refreshed = await refreshStaleGames(limit || 50);
		return { refreshed };
	});
