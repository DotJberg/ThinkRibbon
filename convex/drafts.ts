import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_DRAFTS_PER_USER = 10;

// ============================================
// Article Draft Functions
// ============================================

export const saveArticleDraft = mutation({
	args: {
		draftId: v.optional(v.id("articleDrafts")),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		excerpt: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.optional(v.boolean()),
		tags: v.optional(v.array(v.string())),
		gameIds: v.optional(v.array(v.string())),
		authorClerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.authorClerkId))
			.unique();
		if (!user) throw new Error("User not found");

		// Update existing draft
		if (args.draftId) {
			const existing = await ctx.db.get(args.draftId);
			if (!existing || existing.authorId !== user._id) {
				throw new Error("Draft not found or unauthorized");
			}

			await ctx.db.patch(args.draftId, {
				title: args.title,
				content: args.content,
				excerpt: args.excerpt,
				coverImageUrl: args.coverImageUrl,
				coverFileKey: args.coverFileKey,
				containsSpoilers: args.containsSpoilers,
				tags: args.tags,
				gameIds: args.gameIds,
				updatedAt: Date.now(),
			});
			return args.draftId;
		}

		// Check draft limit
		const drafts = await ctx.db
			.query("articleDrafts")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();

		if (drafts.length >= MAX_DRAFTS_PER_USER) {
			// Delete oldest draft
			const sorted = [...drafts].sort(
				(a, b) => (a.updatedAt || a._creationTime) - (b.updatedAt || b._creationTime),
			);
			const oldest = sorted[0];

			// Delete associated images
			const images = await ctx.db
				.query("articleDraftImages")
				.withIndex("by_draftId", (q) => q.eq("draftId", oldest._id))
				.collect();
			for (const img of images) await ctx.db.delete(img._id);

			await ctx.db.delete(oldest._id);
		}

		return ctx.db.insert("articleDrafts", {
			title: args.title,
			content: args.content,
			excerpt: args.excerpt,
			coverImageUrl: args.coverImageUrl,
			coverFileKey: args.coverFileKey,
			containsSpoilers: args.containsSpoilers ?? false,
			tags: args.tags,
			gameIds: args.gameIds ?? [],
			authorId: user._id,
			updatedAt: Date.now(),
		});
	},
});

export const getArticleDrafts = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return [];

		const drafts = await ctx.db
			.query("articleDrafts")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();

		// Sort by updatedAt desc
		drafts.sort(
			(a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		return Promise.all(
			drafts.map(async (draft) => {
				const images = await ctx.db
					.query("articleDraftImages")
					.withIndex("by_draftId", (q) => q.eq("draftId", draft._id))
					.collect();
				return { ...draft, images };
			}),
		);
	},
});

export const getArticleDraftById = query({
	args: { draftId: v.id("articleDrafts"), clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.authorId !== user._id) {
			throw new Error("Draft not found or unauthorized");
		}

		const images = await ctx.db
			.query("articleDraftImages")
			.withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
			.collect();

		return { ...draft, images };
	},
});

export const deleteArticleDraft = mutation({
	args: {
		draftId: v.id("articleDrafts"),
		clerkId: v.string(),
		preserveImages: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.authorId !== user._id) {
			throw new Error("Draft not found or unauthorized");
		}

		// Delete image records (actual UploadThing deletion happens via action if needed)
		const images = await ctx.db
			.query("articleDraftImages")
			.withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
			.collect();

		// Collect URLs for UploadThing cleanup
		const urlsToDelete: string[] = [];
		if (!args.preserveImages) {
			if (draft.coverImageUrl) urlsToDelete.push(draft.coverImageUrl);
			for (const img of images) urlsToDelete.push(img.url);
		}

		for (const img of images) await ctx.db.delete(img._id);
		await ctx.db.delete(args.draftId);

		return { success: true, urlsToDelete };
	},
});

export const addArticleDraftImage = mutation({
	args: {
		draftId: v.id("articleDrafts"),
		url: v.string(),
		fileKey: v.string(),
		caption: v.optional(v.string()),
		clerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.authorId !== user._id) {
			throw new Error("Draft not found or unauthorized");
		}

		return ctx.db.insert("articleDraftImages", {
			url: args.url,
			fileKey: args.fileKey,
			caption: args.caption,
			draftId: args.draftId,
		});
	},
});

// ============================================
// Review Draft Functions
// ============================================

export const saveReviewDraft = mutation({
	args: {
		draftId: v.optional(v.id("reviewDrafts")),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		rating: v.optional(v.number()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.optional(v.boolean()),
		tags: v.optional(v.array(v.string())),
		gameId: v.optional(v.string()),
		authorClerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.authorClerkId))
			.unique();
		if (!user) throw new Error("User not found");

		if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
			throw new Error("Rating must be between 1 and 5");
		}

		// Update existing
		if (args.draftId) {
			const existing = await ctx.db.get(args.draftId);
			if (!existing || existing.authorId !== user._id) {
				throw new Error("Draft not found or unauthorized");
			}

			await ctx.db.patch(args.draftId, {
				title: args.title,
				content: args.content,
				rating: args.rating,
				coverImageUrl: args.coverImageUrl,
				coverFileKey: args.coverFileKey,
				containsSpoilers: args.containsSpoilers,
				tags: args.tags,
				gameId: args.gameId,
				updatedAt: Date.now(),
			});
			return args.draftId;
		}

		// Check limit
		const drafts = await ctx.db
			.query("reviewDrafts")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();

		if (drafts.length >= MAX_DRAFTS_PER_USER) {
			const sorted = [...drafts].sort(
				(a, b) => (a.updatedAt || a._creationTime) - (b.updatedAt || b._creationTime),
			);
			const oldest = sorted[0];

			const images = await ctx.db
				.query("reviewDraftImages")
				.withIndex("by_draftId", (q) => q.eq("draftId", oldest._id))
				.collect();
			for (const img of images) await ctx.db.delete(img._id);
			await ctx.db.delete(oldest._id);
		}

		return ctx.db.insert("reviewDrafts", {
			title: args.title,
			content: args.content,
			rating: args.rating,
			coverImageUrl: args.coverImageUrl,
			coverFileKey: args.coverFileKey,
			containsSpoilers: args.containsSpoilers ?? false,
			tags: args.tags,
			gameId: args.gameId,
			authorId: user._id,
			updatedAt: Date.now(),
		});
	},
});

export const getReviewDrafts = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return [];

		const drafts = await ctx.db
			.query("reviewDrafts")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();

		drafts.sort(
			(a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		return Promise.all(
			drafts.map(async (draft) => {
				const images = await ctx.db
					.query("reviewDraftImages")
					.withIndex("by_draftId", (q) => q.eq("draftId", draft._id))
					.collect();
				return { ...draft, images };
			}),
		);
	},
});

export const getReviewDraftById = query({
	args: { draftId: v.id("reviewDrafts"), clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.authorId !== user._id) {
			throw new Error("Draft not found or unauthorized");
		}

		const images = await ctx.db
			.query("reviewDraftImages")
			.withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
			.collect();

		return { ...draft, images };
	},
});

export const deleteReviewDraft = mutation({
	args: {
		draftId: v.id("reviewDrafts"),
		clerkId: v.string(),
		preserveImages: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.authorId !== user._id) {
			throw new Error("Draft not found or unauthorized");
		}

		const images = await ctx.db
			.query("reviewDraftImages")
			.withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
			.collect();

		const urlsToDelete: string[] = [];
		if (!args.preserveImages) {
			if (draft.coverImageUrl) urlsToDelete.push(draft.coverImageUrl);
			for (const img of images) urlsToDelete.push(img.url);
		}

		for (const img of images) await ctx.db.delete(img._id);
		await ctx.db.delete(args.draftId);

		return { success: true, urlsToDelete };
	},
});

export const addReviewDraftImage = mutation({
	args: {
		draftId: v.id("reviewDrafts"),
		url: v.string(),
		fileKey: v.string(),
		caption: v.optional(v.string()),
		clerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const draft = await ctx.db.get(args.draftId);
		if (!draft || draft.authorId !== user._id) {
			throw new Error("Draft not found or unauthorized");
		}

		return ctx.db.insert("reviewDraftImages", {
			url: args.url,
			fileKey: args.fileKey,
			caption: args.caption,
			draftId: args.draftId,
		});
	},
});

// ============================================
// Combined
// ============================================

export const getAllDrafts = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return { articleDrafts: [], reviewDrafts: [] };

		const articleDrafts = await ctx.db
			.query("articleDrafts")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();
		articleDrafts.sort(
			(a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		const reviewDrafts = await ctx.db
			.query("reviewDrafts")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();
		reviewDrafts.sort(
			(a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		return { articleDrafts, reviewDrafts };
	},
});
