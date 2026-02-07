export type EmbedPlatform =
	| "youtube"
	| "twitch"
	| "twitter"
	| "bluesky"
	| "instagram";

export interface EmbedInfo {
	platform: EmbedPlatform;
	embedUrl: string;
	originalUrl: string;
	id: string;
}

function parseYouTube(url: URL): EmbedInfo | null {
	let videoId: string | null = null;
	let startTime: string | null = null;

	if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
		videoId = url.pathname.slice(1).split("/")[0] || null;
		startTime = url.searchParams.get("t");
	} else if (
		url.hostname === "www.youtube.com" ||
		url.hostname === "youtube.com" ||
		url.hostname === "m.youtube.com"
	) {
		if (url.pathname === "/watch") {
			videoId = url.searchParams.get("v");
			startTime = url.searchParams.get("t");
		} else if (url.pathname.startsWith("/shorts/")) {
			videoId = url.pathname.split("/shorts/")[1]?.split("/")[0] || null;
		} else if (url.pathname.startsWith("/embed/")) {
			videoId = url.pathname.split("/embed/")[1]?.split("/")[0] || null;
			startTime = url.searchParams.get("start");
		}
	}

	if (!videoId) return null;

	const startParam = startTime ? `?start=${startTime.replace("s", "")}` : "";
	return {
		platform: "youtube",
		embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}${startParam}`,
		originalUrl: url.href,
		id: videoId,
	};
}

type TwitchType = "channel" | "video" | "clip";

function parseTwitch(url: URL): EmbedInfo | null {
	let twitchType: TwitchType | null = null;
	let twitchId: string | null = null;

	if (
		url.hostname === "clips.twitch.tv" ||
		url.hostname === "www.clips.twitch.tv"
	) {
		twitchType = "clip";
		twitchId = url.pathname.slice(1).split("/")[0] || null;
	} else if (url.hostname === "www.twitch.tv" || url.hostname === "twitch.tv") {
		if (url.pathname.startsWith("/videos/")) {
			twitchType = "video";
			twitchId = url.pathname.split("/videos/")[1]?.split("/")[0] || null;
		} else {
			const channel = url.pathname.slice(1).split("/")[0];
			if (channel && !channel.startsWith("_")) {
				twitchType = "channel";
				twitchId = channel;
			}
		}
	}

	if (!twitchType || !twitchId) return null;

	let embedUrl: string;
	switch (twitchType) {
		case "channel":
			embedUrl = `https://player.twitch.tv/?channel=${twitchId}&parent=__PARENT__`;
			break;
		case "video":
			embedUrl = `https://player.twitch.tv/?video=v${twitchId}&parent=__PARENT__`;
			break;
		case "clip":
			embedUrl = `https://clips.twitch.tv/embed?clip=${twitchId}&parent=__PARENT__`;
			break;
	}

	return {
		platform: "twitch",
		embedUrl,
		originalUrl: url.href,
		id: twitchId,
	};
}

function parseTwitter(url: URL): EmbedInfo | null {
	if (
		url.hostname !== "twitter.com" &&
		url.hostname !== "www.twitter.com" &&
		url.hostname !== "x.com" &&
		url.hostname !== "www.x.com"
	) {
		return null;
	}

	const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
	if (!match) return null;

	const tweetId = match[2];
	return {
		platform: "twitter",
		embedUrl: `https://twitter.com/${match[1]}/status/${tweetId}`,
		originalUrl: url.href,
		id: tweetId,
	};
}

function parseBluesky(url: URL): EmbedInfo | null {
	if (url.hostname !== "bsky.app" && url.hostname !== "www.bsky.app") {
		return null;
	}

	const match = url.pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/);
	if (!match) return null;

	const handle = match[1];
	const rkey = match[2];
	return {
		platform: "bluesky",
		embedUrl: `https://embed.bsky.app/embed/${handle}/app.bsky.feed.post/${rkey}`,
		originalUrl: url.href,
		id: rkey,
	};
}

function parseInstagram(url: URL): EmbedInfo | null {
	if (
		url.hostname !== "www.instagram.com" &&
		url.hostname !== "instagram.com"
	) {
		return null;
	}

	const match = url.pathname.match(/^\/(p|reel)\/([^/]+)/);
	if (!match) return null;

	const shortcode = match[2];
	return {
		platform: "instagram",
		embedUrl: `https://www.instagram.com/p/${shortcode}/embed/`,
		originalUrl: url.href,
		id: shortcode,
	};
}

/**
 * Detects pasted HTML embed codes (e.g. Twitter/X blockquote, Instagram embed)
 * and extracts just the clean embed URL, preserving any surrounding user text.
 * Returns the original text unchanged if no embed HTML is detected.
 */
export function cleanEmbedPaste(text: string): string {
	// Quick check — no HTML tags means nothing to clean
	if (!/<[a-z]/i.test(text)) return text;

	// Find the boundaries of the HTML block
	const htmlStart = text.search(/<(?:blockquote|iframe)\b/i);
	if (htmlStart < 0) return text;

	// Find the end: last </script>, </blockquote>, or </iframe>
	const ends = [
		text.lastIndexOf("</script>"),
		text.lastIndexOf("</blockquote>"),
		text.lastIndexOf("</iframe>"),
	]
		.filter((i) => i >= htmlStart)
		.map((i) => {
			if (text.indexOf("</script>", i) === i) return i + 9;
			if (text.indexOf("</blockquote>", i) === i) return i + 14;
			return i + 9;
		});
	const htmlEnd = ends.length > 0 ? Math.max(...ends) : -1;
	if (htmlEnd < 0) return text;

	// Search for an embed URL inside the HTML block
	const htmlBlock = text.slice(htmlStart, htmlEnd);
	const urls = htmlBlock.match(/https?:\/\/[^\s<>"]+/g);
	const embedUrl = urls?.find((u) => getEmbedInfo(u));
	if (!embedUrl) return text;

	// Keep user text before/after the HTML, replace the HTML block with the URL
	const before = text.slice(0, htmlStart).trim();
	const after = text.slice(htmlEnd).trim();
	return [before, embedUrl, after].filter(Boolean).join(" ");
}

/**
 * Transforms pasted HTML: replaces embed code blocks (blockquote, iframe)
 * with a simple `<p><a>` link that TipTap will store as a link mark.
 */
export function cleanEmbedHtml(html: string): string {
	if (!/<(?:blockquote|iframe)\b/i.test(html)) return html;

	let result = html;

	// Replace <blockquote>...(optional <script>...) with a link
	result = result.replace(
		/<blockquote[\s\S]*?<\/blockquote>(\s*<script[\s\S]*?<\/script>)?/gi,
		(match) => {
			const urls = match.match(/https?:\/\/[^\s<>"]+/g);
			const embedUrl = urls?.find((u) => getEmbedInfo(u));
			if (embedUrl) {
				return `<p><a href="${embedUrl}">${embedUrl}</a></p>`;
			}
			return match;
		},
	);

	// Replace <iframe> embeds with a link
	result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, (match) => {
		const srcMatch = match.match(/src=["']([^"']+)["']/);
		if (srcMatch) {
			const embedUrl = srcMatch[1];
			if (getEmbedInfo(embedUrl)) {
				return `<p><a href="${embedUrl}">${embedUrl}</a></p>`;
			}
		}
		return match;
	});

	return result;
}

/**
 * Extracts all URLs from an HTML string and returns the first one
 * recognized as an embeddable URL by getEmbedInfo().
 */
export function extractEmbedUrlFromHtml(html: string): string | null {
	const urls = html.match(/https?:\/\/[^\s<>"]+/g);
	if (!urls) return null;
	for (const url of urls) {
		if (getEmbedInfo(url)) return url;
	}
	return null;
}

export function getEmbedInfo(rawUrl: string): EmbedInfo | null {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return null;
	}

	return (
		parseYouTube(url) ||
		parseTwitch(url) ||
		parseTwitter(url) ||
		parseBluesky(url) ||
		parseInstagram(url)
	);
}
