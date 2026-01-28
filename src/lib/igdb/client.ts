// IGDB API Client with Twitch OAuth token management
// Docs: https://api-docs.igdb.com/

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
	cover?: {
		id: number;
		image_id: string;
	};
	first_release_date?: number;
	genres?: { id: number; name: string }[];
	platforms?: { id: number; name: string }[];
	rating?: number;
}

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getTwitchToken(): Promise<string> {
	// Return cached token if still valid (with 5 min buffer)
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
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
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

export async function searchGames(
	searchQuery: string,
	limit = 10,
): Promise<IGDBGame[]> {
	const query = `
    search "${searchQuery}";
    fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
    limit ${limit};
  `;

	return igdbRequest<IGDBGame[]>("games", query);
}

export async function getGameById(igdbId: number): Promise<IGDBGame | null> {
	const query = `
    fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
    where id = ${igdbId};
    limit 1;
  `;

	const games = await igdbRequest<IGDBGame[]>("games", query);
	return games[0] || null;
}

export async function getGameBySlug(slug: string): Promise<IGDBGame | null> {
	const query = `
    fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
    where slug = "${slug}";
    limit 1;
  `;

	const games = await igdbRequest<IGDBGame[]>("games", query);
	return games[0] || null;
}

export async function getPopularGames(limit = 20): Promise<IGDBGame[]> {
	const query = `
    fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
    where rating > 70 & cover != null;
    sort rating desc;
    limit ${limit};
  `;

	return igdbRequest<IGDBGame[]>("games", query);
}

export async function getRecentGames(limit = 20): Promise<IGDBGame[]> {
	const now = Math.floor(Date.now() / 1000);
	const oneYearAgo = now - 365 * 24 * 60 * 60;

	const query = `
    fields id, name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, rating;
    where first_release_date > ${oneYearAgo} & first_release_date < ${now} & cover != null;
    sort first_release_date desc;
    limit ${limit};
  `;

	return igdbRequest<IGDBGame[]>("games", query);
}

// Build cover URL from image_id
// Sizes: cover_small, cover_big, screenshot_med, screenshot_big, screenshot_huge, thumb, micro, 720p, 1080p
export function buildCoverUrl(
	imageId: string,
	size: "cover_small" | "cover_big" | "720p" | "1080p" = "cover_big",
): string {
	return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export type { IGDBGame };
