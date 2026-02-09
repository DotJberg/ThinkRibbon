import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { api } from "../../../convex/_generated/api";
import { getConvexClient } from "../../lib/convex-server";

const BASE_URL = "https://www.thinkribbon.com";

function toW3CDate(timestamp: number): string {
	return new Date(timestamp).toISOString().split("T")[0];
}

async function generateSitemap(): Promise<string> {
	const client = getConvexClient();
	const entries = await client.query(api.sitemap.getEntries);

	const urls: string[] = [];

	// Static pages
	urls.push(
		url("/", "daily"),
		url("/games", "daily"),
		url("/guidelines", "monthly"),
	);

	// Articles
	for (const article of entries.articles) {
		urls.push(url(`/articles/${article.id}`, "weekly", article.updatedAt));
	}

	// Reviews
	for (const review of entries.reviews) {
		urls.push(url(`/reviews/${review.id}`, "weekly", review.updatedAt));
	}

	// Games
	for (const game of entries.games) {
		urls.push(url(`/games/${game.slug}`, "weekly", game.updatedAt));
	}

	// User profiles
	for (const user of entries.users) {
		urls.push(url(`/profile/${user.username}`, "weekly", user.updatedAt));
	}

	// Posts
	for (const post of entries.posts) {
		urls.push(url(`/posts/${post.id}`, "monthly", post.updatedAt));
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

function url(path: string, changefreq: string, lastmod?: number): string {
	const loc = `  <loc>${BASE_URL}${path}</loc>`;
	const mod = lastmod ? `\n  <lastmod>${toW3CDate(lastmod)}</lastmod>` : "";
	const freq = `\n  <changefreq>${changefreq}</changefreq>`;
	return `<url>\n${loc}${mod}${freq}\n</url>`;
}

export const Route = createFileRoute("/api/sitemap")({
	server: {
		handlers: {
			GET: async () => {
				const xml = await generateSitemap();
				return new Response(xml, {
					headers: {
						"Content-Type": "application/xml",
						"Cache-Control": "public, max-age=3600, s-maxage=3600",
					},
				});
			},
		},
	},
});
