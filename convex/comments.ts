import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { Id } from "./_generated/dataModel";
import type { DataModel } from "./_generated/dataModel";
import { createNotification } from "./notifications";
import { extractFirstUrl } from "./linkPreviews";
import { internal } from "./_generated/api";

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

		// Notify the content owner
		const typeMap = {
			post: "comment_post",
			article: "comment_article",
			review: "comment_review",
		} as const;

		let contentOwnerId: Id<"users"> | null = null;
		if (args.targetType === "post") {
			const post = await ctx.db.get(args.targetId as Id<"posts">);
			contentOwnerId = post?.authorId ?? null;
		} else if (args.targetType === "article") {
			const article = await ctx.db.get(
				args.targetId as Id<"articles">,
			);
			contentOwnerId = article?.authorId ?? null;
		} else if (args.targetType === "review") {
			const review = await ctx.db.get(
				args.targetId as Id<"reviews">,
			);
			contentOwnerId = review?.authorId ?? null;
		}

		if (contentOwnerId) {
			await createNotification(
				ctx,
				contentOwnerId,
				user._id,
				typeMap[args.targetType],
				args.targetId,
			);
		}

		// If replying to a comment, also notify the parent comment author
		if (args.parentId) {
			const parentComment = await ctx.db.get(args.parentId);
			if (parentComment) {
				await createNotification(
					ctx,
					parentComment.authorId,
					user._id,
					"reply_comment",
					args.parentId,
				);
			}
		}

		// Schedule link preview fetch if comment contains a URL
		const url = extractFirstUrl(args.content);
		if (url) {
			await ctx.scheduler.runAfter(
				0,
				internal.linkPreviews.fetchAndStoreCommentLinkPreview,
				{ commentId, url },
			);
		}

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

async function enrichReplies(
	ctx: GenericQueryCtx<DataModel>,
	parentId: Id<"comments">,
	currentUserId: Id<"users"> | null,
): Promise<Array<Record<string, unknown>>> {
	const replies = await ctx.db
		.query("comments")
		.withIndex("by_parentId", (q) => q.eq("parentId", parentId))
		.collect();

	return Promise.all(
		replies
			.sort((a, b) => a._creationTime - b._creationTime)
			.map(async (reply) => {
				const nestedReplies = await enrichReplies(
					ctx,
					reply._id,
					currentUserId,
				);

				if (reply.deleted) {
					return {
						...reply,
						author: null,
						_count: { likes: 0, replies: nestedReplies.length },
						hasLiked: false,
						replies: nestedReplies,
					};
				}

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
								clerkId: replyAuthor.clerkId,
								username: replyAuthor.username,
								displayName: replyAuthor.displayName,
								avatarUrl: replyAuthor.avatarUrl,
							}
						: null,
					_count: {
						likes: replyLikes.length,
						replies: nestedReplies.length,
					},
					hasLiked: replyHasLiked,
					replies: nestedReplies,
				};
			}),
	);
}

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
				const enrichedReplies = await enrichReplies(
					ctx,
					comment._id,
					currentUserId,
				);

				if (comment.deleted) {
					return {
						...comment,
						author: null,
						_count: { likes: 0, replies: enrichedReplies.length },
						hasLiked: false,
						replies: enrichedReplies,
					};
				}

				const author = await ctx.db.get(comment.authorId);

				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "comment").eq("targetId", comment._id),
					)
					.collect();

				const hasLiked = currentUserId
					? likes.some((l) => l.userId === currentUserId)
					: false;

				return {
					...comment,
					author: author
						? {
								_id: author._id,
								clerkId: author.clerkId,
								username: author.username,
								displayName: author.displayName,
								avatarUrl: author.avatarUrl,
							}
						: null,
					_count: { likes: likes.length, replies: enrichedReplies.length },
					hasLiked,
					replies: enrichedReplies,
				};
			}),
		);

		return { comments: enriched, nextCursor };
	},
});

async function deleteCommentTree(
	ctx: GenericMutationCtx<DataModel>,
	commentId: Id<"comments">,
) {
	// Recursively delete children first
	const children = await ctx.db
		.query("comments")
		.withIndex("by_parentId", (q) => q.eq("parentId", commentId))
		.collect();
	for (const child of children) {
		await deleteCommentTree(ctx, child._id);
	}

	// Delete likes on this comment
	const likes = await ctx.db
		.query("likes")
		.withIndex("by_target", (q) =>
			q.eq("targetType", "comment").eq("targetId", commentId),
		)
		.collect();
	for (const like of likes) {
		await ctx.db.delete(like._id);
	}

	// Delete the comment itself
	await ctx.db.delete(commentId);
}

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

		// Check if comment has children
		const children = await ctx.db
			.query("comments")
			.withIndex("by_parentId", (q) => q.eq("parentId", args.commentId))
			.collect();

		if (children.length > 0) {
			// Soft delete: clear content and mark as deleted, preserving the reply tree
			await ctx.db.patch(args.commentId, {
				deleted: true,
				content: "",
				linkPreview: undefined,
			});
		} else {
			// Hard delete: no children, remove entirely
			await deleteCommentTree(ctx, args.commentId);
		}

		return { success: true };
	},
});
