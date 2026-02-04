// Shared game type definitions

/**
 * Game data as returned from IGDB search/cache operations
 */
export interface GameSearchResult {
	_id: string;
	name: string;
	slug: string;
	coverUrl?: string;
	genres: string[];
	releaseDate?: number;
	categoryLabel?: string;
	hypes?: number;
}

/**
 * Formatted game data for display in UI components
 * Used after converting timestamp to Date object
 */
export interface FormattedGame {
	id: string;
	name: string;
	slug: string;
	coverUrl: string | null;
	genres: string[];
	releaseDate: Date;
	categoryLabel?: string;
}

/**
 * Game data with review statistics
 */
export interface GameWithStats extends GameSearchResult {
	_count?: {
		reviews: number;
	};
	averageRating?: number;
}
