// Client-side link preview fetching

export interface LinkPreviewData {
	url: string;
	title?: string;
	description?: string;
	imageUrl?: string;
	siteName?: string;
	domain: string;
}

// Extract first URL from content
export function extractFirstUrl(content: string): string | null {
	const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
	const match = content.match(urlRegex);
	return match ? match[0] : null;
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
	try {
		const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`;

		const response = await fetch(apiUrl);
		if (!response.ok) {
			return null;
		}

		const data = await response.json();

		if (data.status !== "success" || !data.data) {
			return null;
		}

		const { title, description, image, publisher } = data.data;

		return {
			url,
			title: title || undefined,
			description: description || undefined,
			imageUrl: image?.url || undefined,
			siteName: publisher || undefined,
			domain: getDomain(url),
		};
	} catch {
		// Fallback: return basic info if API fails
		return {
			url,
			domain: getDomain(url),
		};
	}
}
