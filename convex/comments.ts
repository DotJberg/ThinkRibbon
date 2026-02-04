import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
	args: {
		content: v.string(),
		authorClerkId: v.string(),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
		),
		targetId: v.string(),
		parentId: v.optional(v.id("comments")),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.authorClerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const commentId = await ctx.db.insert("comments", {
			content: args.content.slice(0, 1000),
			authorId: user._id,
			targetType: args.targetType,
			targetId: args.targetId,
			parentId: args.parentId,
			updatedAt: Date.now(),
		});

		const comment = await ctx.db.get(commentId);
		return {
			...comment,
			author: {
				_id: user._id,
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
			},
		};
	},
});

export const getByTarget = query({
	args: {
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
		),
		targetId: v.string(),
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
		clerkId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		let currentUserId: Id<"users"> | null = null;
		if (args.clerkId) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
				.unique();
			currentUserId = user?._id ?? null;
		}

		// Get top-level comments (no parentId)
		let allComments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", args.targetType).eq("targetId", args.targetId),
			)
			.collect();

		// Filter to top-level only
		allComments = allComments.filter((c) => !c.parentId);

		// Sort by likes count desc (need to compute), then by creation time
		const commentsWithLikes = await Promise.all(
			allComments.map(async (comment) => {
				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "comment").eq("targetId", comment._id),
					)
					.collect();
				return { comment, likeCount: likes.length };
			}),
		);

		commentsWithLikes.sort((a, b) => {
			if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
			return b.comment._creationTime - a.comment._creationTime;
		});

		const sortedComments = commentsWithLikes.map((c) => c.comment);

		// Apply cursor
		let startIdx = 0;
		if (args.cursor) {
			const idx = sortedComments.findIndex((c) => c._id === args.cursor);
			if (idx !== -1) startIdx = idx + 1;
		}

		const paginated = sortedComments.slice(startIdx, startIdx + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		// Enrich each comment
		const enriched = await Promise.all(
			paginated.map(async (comment) => {
				const author = await ctx.db.get(comment.authorId);

				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "comment").eq("targetId", comment._id),
					)
					.collect();

				const replies = await ctx.db
					.query("comments")
					.withIndex("by_parentId", (q) => q.eq("parentId", comment._id))
					.collect();

				const hasLiked = currentUserId
					? likes.some((l) => l.userId === currentUserId)
					: false;

				// Enrich replies
				const enrichedReplies = await Promise.all(
					replies
						.sort((a, b) => a._creationTime - b._creationTime)
						.map(async (reply) => {
							const replyAuthor = await ctx.db.get(reply.authorId);
							const replyLikes = await ctx.db
								.query("likes")
								.withIndex("by_target", (q) =>
									q.eq("targetType", "comment").eq("targetId", reply._id),
								)
								.collect();
							const replyHasLiked = currentUserId
								? replyLikes.some((l) => l.userId === currentUserId)
								: false;

							return {
								...reply,
								author: replyAuthor
									? {
											_id: replyAuthor._id,
											username: replyAuthor.username,
											displayName: replyAuthor.displayName,
											avatarUrl: replyAuthor.avatarUrl,
										}
									: null,
								_count: { likes: replyLikes.length },
								hasLiked: replyHasLiked,
							};
						}),
				);

				return {
					...comment,
					author: author
						? {
								_id: author._id,
								username: author.username,
								displayName: author.displayName,
								avatarUrl: author.avatarUrl,
							}
						: null,
					_count: { likes: likes.length, replies: replies.length },
					hasLiked,
					replies: enrichedReplies,
				};
			}),
		);

		return { comments: enriched, nextCursor };
	},
});

export const deleteComment = mutation({
	args: { commentId: v.id("comments"), clerkId: v.string() },
	handler: async (ctx, args) => {
		const comment = await ctx.db.get(args.commentId);
		if (!comment) throw new Error("Comment not found");

		const author = await ctx.db.get(comment.authorId);
		const requestingUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		const isAdmin = requestingUser?.admin === true;
		if (!author || (author.clerkId !== args.clerkId && !isAdmin)) {
			throw new Error("Unauthorized");
		}

		// Delete likes on this comment
		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "comment").eq("targetId", args.commentId),
			)
			.collect();
		for (const like of likes) {
			await ctx.db.delete(like._id);
		}

		// Delete replies and their likes
		const replies = await ctx.db
			.query("comments")
			.withIndex("by_parentId", (q) => q.eq("parentId", args.commentId))
			.collect();
		for (const reply of replies) {
			const replyLikes = await ctx.db
				.query("likes")
				.withIndex("by_target", (q) =>
					q.eq("targetType", "comment").eq("targetId", reply._id),
				)
				.collect();
			for (const rl of replyLikes) {
				await ctx.db.delete(rl._id);
			}
			await ctx.db.delete(reply._id);
		}

		await ctx.db.delete(args.commentId);
		return { success: true };
	},
});
