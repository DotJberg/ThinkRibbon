// Client-side link preview fetching

export interface LinkPreviewData {
	url: string;
	title?: string;
	description?: string;
	imageUrl?: string;
	siteName?: string;
	domain: string;
}

// In-memory cache with 5-minute TTL
const previewCache = new Map<
	string,
	{ data: LinkPreviewData | null; expiresAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT_MS = 5000; // 5 seconds

// Extract first URL from content
export function extractFirstUrl(content: string): string | null {
	const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
	const match = content.match(urlRegex);
	return match ? match[0] : null;
}

// Strip the first URL from content and clean up leftover whitespace
export function stripFirstUrl(content: string): string {
	const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
	const match = urlRegex.exec(content);
	if (!match) return content;
	const before = content.slice(0, match.index);
	const after = content.slice(match.index + match[0].length);
	return (before + after).replace(/\n{3,}/g, "\n\n").trim();
}

// Extract domain from URL
function getDomain(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

// Fetch link preview using microlink.io API (free tier)
export async function fetchLinkPreview(
	url: string,
): Promise<LinkPreviewData | null> {
	// Check cache first
	const cached = previewCache.get(url);
	if (cached && Date.now() < cached.expiresAt) {
		return cached.data;
	}

	try {
		const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`;

		// Add timeout using AbortController
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		let response: Response;
		try {
			response = await fetch(apiUrl, { signal: controller.signal });
		} finally {
			clearTimeout(timeoutId);
		}

		if (!response.ok) {
			// Cache null result to avoid repeated failed requests
			previewCache.set(url, {
				data: null,
				expiresAt: Date.now() + CACHE_TTL_MS,
			});
			return null;
		}

		const data = await response.json();

		if (data.status !== "success" || !data.data) {
			previewCache.set(url, {
				data: null,
				expiresAt: Date.now() + CACHE_TTL_MS,
			});
			return null;
		}

		const { title, description, image, publisher } = data.data;

		const result: LinkPreviewData = {
			url,
			title: title || undefined,
			description: description || undefined,
			imageUrl: image?.url || undefined,
			siteName: publisher || undefined,
			domain: getDomain(url),
		};

		// Cache successful result
		previewCache.set(url, {
			data: result,
			expiresAt: Date.now() + CACHE_TTL_MS,
		});

		return result;
	} catch {
		// Fallback: return basic info if API fails
		const fallback: LinkPreviewData = {
			url,
			domain: getDomain(url),
		};

		// Cache fallback with shorter TTL (1 minute) to retry sooner
		previewCache.set(url, { data: fallback, expiresAt: Date.now() + 60000 });

		return fallback;
	}
}
