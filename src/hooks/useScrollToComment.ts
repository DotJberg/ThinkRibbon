import { useEffect } from "react";

/**
 * Scrolls to a comment element when the URL contains a #comment-{id} hash.
 * Retries briefly to handle comments that load asynchronously.
 */
export function useScrollToComment(dataLoaded: boolean) {
	useEffect(() => {
		if (!dataLoaded) return;

		const hash = window.location.hash.slice(1);
		if (!hash.startsWith("comment-")) return;

		let attempts = 0;
		const maxAttempts = 10;

		const tryScroll = () => {
			const el = document.getElementById(hash);
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				el.classList.add("ring-2", "ring-slate-500", "rounded-xl");
				setTimeout(
					() => el.classList.remove("ring-2", "ring-slate-500", "rounded-xl"),
					2000,
				);
				return;
			}
			attempts++;
			if (attempts < maxAttempts) {
				setTimeout(tryScroll, 200);
			}
		};

		setTimeout(tryScroll, 100);
	}, [dataLoaded]);
}
