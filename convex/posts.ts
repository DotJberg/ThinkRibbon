import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
	args: {
		content: v.string(),
		authorClerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.authorClerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const postId = await ctx.db.insert("posts", {
			content: args.content.slice(0, 280),
			authorId: user._id,
			updatedAt: Date.now(),
		});

		return postId;
	},
});

export const getById = query({
	args: { id: v.id("posts") },
	handler: async (ctx, args) => {
		const post = await ctx.db.get(args.id);
		if (!post) return null;

		const author = await ctx.db.get(post.authorId);

		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "post").eq("targetId", post._id),
			)
			.collect();

		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "post").eq("targetId", post._id),
			)
			.collect();

		return {
			...post,
			author: author
				? {
						_id: author._id,
						username: author.username,
						displayName: author.displayName,
						avatarUrl: author.avatarUrl,
						clerkId: author.clerkId,
					}
				: null,
			_count: { likes: likes.length, comments: comments.length },
		};
	},
});

export const getByUser = query({
	args: {
		username: v.string(),
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
		clerkId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		const targetUser = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();
		if (!targetUser) return { posts: [], nextCursor: undefined };

		// Get current user for like status
		let currentUserId: Id<"users"> | null = null;
		if (args.clerkId) {
			const currentUser = await ctx.db
				.query("users")
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
				.unique();
			currentUserId = currentUser?._id ?? null;
		}

		let allPosts = await ctx.db
			.query("posts")
			.withIndex("by_authorId", (q) => q.eq("authorId", targetUser._id))
			.order("desc")
			.collect();

		// Apply cursor
		if (args.cursor) {
			const cursorIdx = allPosts.findIndex((p) => p._id === args.cursor);
			if (cursorIdx !== -1) {
				allPosts = allPosts.slice(cursorIdx + 1);
			}
		}

		const paginated = allPosts.slice(0, limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		const posts = await Promise.all(
			paginated.map(async (post) => {
				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "post").eq("targetId", post._id),
					)
					.collect();

				const comments = await ctx.db
					.query("comments")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "post").eq("targetId", post._id),
					)
					.collect();

				const hasLiked = currentUserId
					? likes.some((l) => l.userId === currentUserId)
					: false;

				return {
					...post,
					author: {
						_id: targetUser._id,
						username: targetUser.username,
						displayName: targetUser.displayName,
						avatarUrl: targetUser.avatarUrl,
					},
					_count: { likes: likes.length, comments: comments.length },
					hasLiked,
				};
			}),
		);

		return { posts, nextCursor };
	},
});

export const deletePost = mutation({
	args: { postId: v.id("posts"), clerkId: v.string() },
	handler: async (ctx, args) => {
		const post = await ctx.db.get(args.postId);
		if (!post) throw new Error("Post not found");

		const author = await ctx.db.get(post.authorId);
		if (!author || author.clerkId !== args.clerkId) {
			throw new Error("Unauthorized");
		}

		// Cascade: delete likes
		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "post").eq("targetId", args.postId),
			)
			.collect();
		for (const like of likes) {
			await ctx.db.delete(like._id);
		}

		// Cascade: delete comments and their likes
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "post").eq("targetId", args.postId),
			)
			.collect();
		for (const comment of comments) {
			const commentLikes = await ctx.db
				.query("likes")
				.withIndex("by_target", (q) =>
					q.eq("targetType", "comment").eq("targetId", comment._id),
				)
				.collect();
			for (const cl of commentLikes) {
				await ctx.db.delete(cl._id);
			}
			// Delete replies
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
				for (const rl of replyLikes) {
					await ctx.db.delete(rl._id);
				}
				await ctx.db.delete(reply._id);
			}
			await ctx.db.delete(comment._id);
		}

		await ctx.db.delete(args.postId);
		return { success: true };
	},
});
