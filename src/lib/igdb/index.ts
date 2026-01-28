export type { CachedGame } from "./cache";
export {
	getCachedGameByIgdbId,
	getCachedGameBySlug,
	refreshStaleGames,
	searchAndCacheGames,
} from "./cache";
export type { IGDBGame } from "./client";
export {
	buildCoverUrl,
	getGameById,
	getGameBySlug,
	getPopularGames,
	getRecentGames,
	searchGames,
} from "./client";
