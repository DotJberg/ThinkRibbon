import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EmbedInfo } from "../../lib/embed-utils";

declare global {
	interface Window {
		twttr?: {
			widgets: {
				load: (el?: HTMLElement) => void;
			};
		};
	}
}

const EMBED_WRAPPER = "rounded-lg overflow-hidden border border-gray-700";

function YouTubeEmbed({ embed }: { embed: EmbedInfo }) {
	return (
		<div className={EMBED_WRAPPER}>
			<div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
				<iframe
					src={embed.embedUrl}
					title="YouTube video"
					className="absolute inset-0 w-full h-full"
					sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
					allowFullScreen
					loading="lazy"
				/>
			</div>
		</div>
	);
}

function TwitchEmbed({ embed }: { embed: EmbedInfo }) {
	const src = useMemo(
		() =>
			typeof window !== "undefined"
				? embed.embedUrl.replace("__PARENT__", window.location.hostname)
				: embed.embedUrl,
		[embed.embedUrl],
	);

	return (
		<div className={EMBED_WRAPPER}>
			<div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
				<iframe
					src={src}
					title="Twitch stream"
					className="absolute inset-0 w-full h-full"
					sandbox="allow-scripts allow-same-origin allow-popups"
					allowFullScreen
					loading="lazy"
				/>
			</div>
		</div>
	);
}

// Load Twitter widget.js once
let twttrPromise: Promise<typeof window.twttr> | null = null;

function loadTwitterWidgets(): Promise<typeof window.twttr> {
	if (twttrPromise) return twttrPromise;
	twttrPromise = new Promise((resolve, reject) => {
		if (window?.twttr?.widgets) {
			resolve(window.twttr);
			return;
		}
		const script = document.createElement("script");
		script.src = "https://platform.twitter.com/widgets.js";
		script.async = true;
		script.onload = () => {
			const check = () => {
				if (window.twttr?.widgets) {
					resolve(window.twttr);
				} else {
					setTimeout(check, 100);
				}
			};
			check();
		};
		script.onerror = () => {
			twttrPromise = null;
			reject(new Error("Failed to load Twitter widgets"));
		};
		document.head.appendChild(script);
	});
	return twttrPromise;
}

function TwitterEmbed({ embed }: { embed: EmbedInfo }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const timeout = setTimeout(() => {
			if (!cancelled) setFailed(true);
		}, 5000);

		loadTwitterWidgets()
			.then((twttr) => {
				if (!cancelled && containerRef.current && twttr?.widgets) {
					clearTimeout(timeout);
					twttr.widgets.load(containerRef.current);
				}
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, []);

	if (failed) {
		return (
			<div className={EMBED_WRAPPER}>
				<a
					href={embed.originalUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-gray-300 transition-colors"
				>
					View on X (Twitter)
				</a>
			</div>
		);
	}

	return (
		<div ref={containerRef} className="flex justify-center">
			<blockquote className="twitter-tweet" data-theme="dark">
				<a href={embed.embedUrl}>Loading tweet...</a>
			</blockquote>
		</div>
	);
}

function BlueskyEmbed({ embed }: { embed: EmbedInfo }) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [height, setHeight] = useState(300);

	const handleMessage = useCallback((event: MessageEvent) => {
		if (event.origin !== "https://embed.bsky.app") return;
		if (
			event.data?.type === "resize" &&
			typeof event.data.height === "number"
		) {
			setHeight(event.data.height);
		}
	}, []);

	useEffect(() => {
		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [handleMessage]);

	return (
		<div className={EMBED_WRAPPER}>
			<iframe
				ref={iframeRef}
				src={embed.embedUrl}
				title="Bluesky post"
				className="w-full"
				style={{ height, border: "none" }}
				sandbox="allow-scripts allow-same-origin allow-popups"
				loading="lazy"
			/>
		</div>
	);
}

function InstagramEmbed({ embed }: { embed: EmbedInfo }) {
	return (
		<div className={EMBED_WRAPPER}>
			<iframe
				src={embed.embedUrl}
				title="Instagram post"
				className="w-full"
				style={{ minHeight: 500, border: "none" }}
				sandbox="allow-scripts allow-same-origin allow-popups"
				allowFullScreen
				loading="lazy"
			/>
		</div>
	);
}

export function EmbedRenderer({ embed }: { embed: EmbedInfo }) {
	switch (embed.platform) {
		case "youtube":
			return <YouTubeEmbed embed={embed} />;
		case "twitch":
			return <TwitchEmbed embed={embed} />;
		case "twitter":
			return <TwitterEmbed embed={embed} />;
		case "bluesky":
			return <BlueskyEmbed embed={embed} />;
		case "instagram":
			return <InstagramEmbed embed={embed} />;
	}
}
