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
