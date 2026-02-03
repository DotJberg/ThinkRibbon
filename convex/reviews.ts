import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
	args: {
		title: v.string(),
		content: v.string(),
		contentJson: v.optional(v.string()),
		rating: v.number(),
		gameId: v.id("games"),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.optional(v.boolean()),
		published: v.optional(v.boolean()),
		authorClerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.authorClerkId))
			.unique();
		if (!user) throw new Error("User not found");

		if (args.rating < 1 || args.rating > 5) {
			throw new Error("Rating must be between 1 and 5");
		}

		return ctx.db.insert("reviews", {
			title: args.title,
			content: args.content,
			contentJson: args.contentJson,
			rating: args.rating,
			gameId: args.gameId,
			coverImageUrl: args.coverImageUrl,
			coverFileKey: args.coverFileKey,
			containsSpoilers: args.containsSpoilers ?? false,
			published: args.published ?? false,
			authorId: user._id,
			updatedAt: Date.now(),
		});
	},
});

export const update = mutation({
	args: {
		reviewId: v.id("reviews"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		contentJson: v.optional(v.string()),
		rating: v.optional(v.number()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.optional(v.boolean()),
		published: v.optional(v.boolean()),
		clerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const review = await ctx.db.get(args.reviewId);
		if (!review) throw new Error("Review not found");

		const author = await ctx.db.get(review.authorId);
		if (!author || author.clerkId !== args.clerkId) {
			throw new Error("Unauthorized");
		}

		if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
			throw new Error("Rating must be between 1 and 5");
		}

		const updateData: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.title !== undefined) updateData.title = args.title;
		if (args.content !== undefined) updateData.content = args.content;
		if (args.contentJson !== undefined)
			updateData.contentJson = args.contentJson;
		if (args.rating !== undefined) updateData.rating = args.rating;
		if (args.coverImageUrl !== undefined)
			updateData.coverImageUrl = args.coverImageUrl;
		if (args.coverFileKey !== undefined)
			updateData.coverFileKey = args.coverFileKey;
		if (args.containsSpoilers !== undefined)
			updateData.containsSpoilers = args.containsSpoilers;
		if (args.published !== undefined) updateData.published = args.published;

		await ctx.db.patch(args.reviewId, updateData);
		return args.reviewId;
	},
});

export const getById = query({
	args: { reviewId: v.id("reviews") },
	handler: async (ctx, args) => {
		const review = await ctx.db.get(args.reviewId);
		if (!review) return null;

		const author = await ctx.db.get(review.authorId);
		const game = await ctx.db.get(review.gameId);

		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "review").eq("targetId", args.reviewId),
			)
			.collect();
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "review").eq("targetId", args.reviewId),
			)
			.collect();

		return {
			...review,
			author: author
				? {
						_id: author._id,
						username: author.username,
						displayName: author.displayName,
						avatarUrl: author.avatarUrl,
					}
				: null,
			game,
			_count: { likes: likes.length, comments: comments.length },
		};
	},
});

export const getFeed = query({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 10;

		let allReviews = await ctx.db
			.query("reviews")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.collect();

		if (args.cursor) {
			const idx = allReviews.findIndex((r) => r._id === args.cursor);
			if (idx !== -1) allReviews = allReviews.slice(idx + 1);
		}

		const paginated = allReviews.slice(0, limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		const enriched = await Promise.all(
			paginated.map(async (review) => {
				const author = await ctx.db.get(review.authorId);
				const game = await ctx.db.get(review.gameId);
				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "review").eq("targetId", review._id),
					)
					.collect();
				const comments = await ctx.db
					.query("comments")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "review").eq("targetId", review._id),
					)
					.collect();

				return {
					...review,
					author: author
						? {
								_id: author._id,
								username: author.username,
								displayName: author.displayName,
								avatarUrl: author.avatarUrl,
							}
						: null,
					game: game
						? {
								_id: game._id,
								name: game.name,
								slug: game.slug,
								coverUrl: game.coverUrl,
							}
						: null,
					_count: { likes: likes.length, comments: comments.length },
				};
			}),
		);

		return { reviews: enriched, nextCursor };
	},
});

export const getByGame = query({
	args: {
		gameId: v.id("games"),
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 10;

		let allReviews = await ctx.db
			.query("reviews")
			.withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
			.order("desc")
			.collect();

		allReviews = allReviews.filter((r) => r.published);

		if (args.cursor) {
			const idx = allReviews.findIndex((r) => r._id === args.cursor);
			if (idx !== -1) allReviews = allReviews.slice(idx + 1);
		}

		const paginated = allReviews.slice(0, limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		const enriched = await Promise.all(
			paginated.map(async (review) => {
				const author = await ctx.db.get(review.authorId);
				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "review").eq("targetId", review._id),
					)
					.collect();
				const comments = await ctx.db
					.query("comments")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "review").eq("targetId", review._id),
					)
					.collect();

				return {
					...review,
					author: author
						? {
								_id: author._id,
								username: author.username,
								displayName: author.displayName,
								avatarUrl: author.avatarUrl,
							}
						: null,
					_count: { likes: likes.length, comments: comments.length },
				};
			}),
		);

		return { reviews: enriched, nextCursor };
	},
});

export const getByUser = query({
	args: {
		username: v.string(),
		includeUnpublished: v.optional(v.boolean()),
		clerkId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const targetUser = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();
		if (!targetUser) return [];

		let currentUserId: Id<"users"> | null = null;
		if (args.clerkId) {
			const currentUser = await ctx.db
				.query("users")
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
				.unique();
			currentUserId = currentUser?._id ?? null;
		}

		let reviews = await ctx.db
			.query("reviews")
			.withIndex("by_authorId", (q) => q.eq("authorId", targetUser._id))
			.order("desc")
			.collect();

		if (!args.includeUnpublished) {
			reviews = reviews.filter((r) => r.published);
		}

		return Promise.all(
			reviews.map(async (review) => {
				const game = await ctx.db.get(review.gameId);
				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "review").eq("targetId", review._id),
					)
					.collect();
				const comments = await ctx.db
					.query("comments")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "review").eq("targetId", review._id),
					)
					.collect();

				const hasLiked = currentUserId
					? likes.some((l) => l.userId === currentUserId)
					: false;

				return {
					...review,
					author: {
						_id: targetUser._id,
						username: targetUser.username,
						displayName: targetUser.displayName,
						avatarUrl: targetUser.avatarUrl,
					},
					game: game
						? {
								_id: game._id,
								name: game.name,
								slug: game.slug,
								coverUrl: game.coverUrl,
							}
						: null,
					_count: { likes: likes.length, comments: comments.length },
					hasLiked,
				};
			}),
		);
	},
});

export const getAverageRating = query({
	args: { gameId: v.id("games") },
	handler: async (ctx, args) => {
		const reviews = await ctx.db
			.query("reviews")
			.withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
			.collect();

		const published = reviews.filter((r) => r.published);
		if (published.length === 0) {
			return { averageRating: 0, reviewCount: 0 };
		}

		const sum = published.reduce((acc, r) => acc + r.rating, 0);
		return {
			averageRating: sum / published.length,
			reviewCount: published.length,
		};
	},
});

export const deleteReview = mutation({
	args: { reviewId: v.id("reviews"), clerkId: v.string() },
	handler: async (ctx, args) => {
		const review = await ctx.db.get(args.reviewId);
		if (!review) throw new Error("Review not found");

		const author = await ctx.db.get(review.authorId);
		if (!author || author.clerkId !== args.clerkId) {
			throw new Error("Unauthorized");
		}

		// Cascade: images
		const images = await ctx.db
			.query("reviewImages")
			.withIndex("by_reviewId", (q) => q.eq("reviewId", args.reviewId))
			.collect();
		for (const img of images) await ctx.db.delete(img._id);

		// Cascade: likes
		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "review").eq("targetId", args.reviewId),
			)
			.collect();
		for (const like of likes) await ctx.db.delete(like._id);

		// Cascade: comments and their likes
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "review").eq("targetId", args.reviewId),
			)
			.collect();
		for (const comment of comments) {
			const commentLikes = await ctx.db
				.query("likes")
				.withIndex("by_target", (q) =>
					q.eq("targetType", "comment").eq("targetId", comment._id),
				)
				.collect();
			for (const cl of commentLikes) await ctx.db.delete(cl._id);
			const replies = await ctx.db
				.query("comments")
				.withIndex("by_parentId", (q) => q.eq("parentId", comment._id))
				.collect();
			for (const reply of replies) {
				const replyLikes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "comment").eq("targetId", reply._id),
					)
					.collect();
				for (const rl of replyLikes) await ctx.db.delete(rl._id);
				await ctx.db.delete(reply._id);
			}
			await ctx.db.delete(comment._id);
		}

		await ctx.db.delete(args.reviewId);
		return { success: true };
	},
});
