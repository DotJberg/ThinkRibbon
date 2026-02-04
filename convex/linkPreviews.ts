import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

interface LinkMetadata {
	url: string;
	title?: string;
	description?: string;
	imageUrl?: string;
	siteName?: string;
	domain: string;
}

// Fetch Open Graph metadata from a URL
async function fetchOgMetadata(url: string): Promise<LinkMetadata | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; ThinkRibbon/1.0; +https://thinkribbon.com)",
				Accept: "text/html,application/xhtml+xml",
			},
		});

		clearTimeout(timeout);

		if (!response.ok) {
			return null;
		}

		const html = await response.text();
		const domain = getDomain(url);

		// Parse OG tags using regex (simpler than DOM parsing in Convex)
		const getMetaContent = (
			property: string,
			html: string,
		): string | undefined => {
			// Try og: prefix
			const ogRegex = new RegExp(
				`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`,
				"i",
			);
			const ogMatch = html.match(ogRegex);
			if (ogMatch) return ogMatch[1];

			// Try reverse order (content before property)
			const ogReverseRegex = new RegExp(
				`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`,
				"i",
			);
			const ogReverseMatch = html.match(ogReverseRegex);
			if (ogReverseMatch) return ogReverseMatch[1];

			// Try twitter: prefix as fallback
			const twitterRegex = new RegExp(
				`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`,
				"i",
			);
			const twitterMatch = html.match(twitterRegex);
			if (twitterMatch) return twitterMatch[1];

			return undefined;
		};

		// Get title - try OG first, then <title> tag
		let title = getMetaContent("title", html);
		if (!title) {
			const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
			title = titleMatch ? titleMatch[1].trim() : undefined;
		}

		const description = getMetaContent("description", html);
		let imageUrl = getMetaContent("image", html);

		// Resolve relative image URLs
		if (imageUrl && !imageUrl.startsWith("http")) {
			try {
				const base = new URL(url);
				imageUrl = new URL(imageUrl, base).href;
			} catch {
				// Keep as-is if URL parsing fails
			}
		}

		const siteName = getMetaContent("site_name", html);

		return {
			url,
			title: title ? decodeHtmlEntities(title) : undefined,
			description: description ? decodeHtmlEntities(description) : undefined,
			imageUrl,
			siteName: siteName ? decodeHtmlEntities(siteName) : undefined,
			domain,
		};
	} catch {
		return null;
	}
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ");
}

// Internal mutation to store the link preview
export const storeLinkPreview = internalMutation({
	args: {
		postId: v.id("posts"),
		url: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		siteName: v.optional(v.string()),
		domain: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if already exists
		const existing = await ctx.db
			.query("postLinkPreviews")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.first();

		if (existing) {
			return existing._id;
		}

		return await ctx.db.insert("postLinkPreviews", {
			postId: args.postId,
			url: args.url,
			title: args.title,
			description: args.description,
			imageUrl: args.imageUrl,
			siteName: args.siteName,
			domain: args.domain,
		});
	},
});

// Action to fetch and store link preview for a post
export const fetchAndStoreLinkPreview = action({
	args: {
		postId: v.id("posts"),
		url: v.string(),
	},
	handler: async (ctx, args) => {
		const metadata = await fetchOgMetadata(args.url);

		if (metadata) {
			await ctx.runMutation(internal.linkPreviews.storeLinkPreview, {
				postId: args.postId as Id<"posts">,
				url: metadata.url,
				title: metadata.title,
				description: metadata.description,
				imageUrl: metadata.imageUrl,
				siteName: metadata.siteName,
				domain: metadata.domain,
			});
		}

		return metadata;
	},
});
