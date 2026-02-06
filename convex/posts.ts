import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
	args: {
		content: v.string(),
		authorClerkId: v.string(),
		images: v.optional(
			v.array(
				v.object({
					url: v.string(),
					fileKey: v.string(),
					caption: v.optional(v.string()),
				}),
			),
		),
		linkPreview: v.optional(
			v.object({
				url: v.string(),
				title: v.optional(v.string()),
				description: v.optional(v.string()),
				imageUrl: v.optional(v.string()),
				siteName: v.optional(v.string()),
				domain: v.string(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.authorClerkId))
			.unique();
		if (!user) throw new Error("User not found");

		// When a link preview is present, the URL doesn't count towards the limit
		const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/;
		const urlMatch = args.linkPreview ? urlRegex.exec(args.content) : null;
		const sliceLimit = urlMatch ? 280 + urlMatch[0].length + 1 : 280;

		const postId = await ctx.db.insert("posts", {
			content: args.content.slice(0, sliceLimit),
			authorId: user._id,
			updatedAt: Date.now(),
		});

		if (args.images) {
			for (const img of args.images.slice(0, 4)) {
				await ctx.db.insert("postImages", {
					url: img.url,
					fileKey: img.fileKey,
					caption: img.caption,
					postId,
				});
			}
		}

		// Store link preview if provided (only if no images)
		const hasImages = args.images && args.images.length > 0;
		if (!hasImages && args.linkPreview) {
			await ctx.db.insert("postLinkPreviews", {
				postId,
				url: args.linkPreview.url,
				title: args.linkPreview.title,
				description: args.linkPreview.description,
				imageUrl: args.linkPreview.imageUrl,
				siteName: args.linkPreview.siteName,
				domain: args.linkPreview.domain,
			});
		}

		return { postId };
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

		const images = await ctx.db
			.query("postImages")
			.withIndex("by_postId", (q) => q.eq("postId", post._id))
			.collect();

		const linkPreview = await ctx.db
			.query("postLinkPreviews")
			.withIndex("by_postId", (q) => q.eq("postId", post._id))
			.first();

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
			images: images.map((img) => ({
				url: img.url,
				caption: img.caption,
			})),
			linkPreview: linkPreview
				? {
						url: linkPreview.url,
						title: linkPreview.title,
						description: linkPreview.description,
						imageUrl: linkPreview.imageUrl,
						siteName: linkPreview.siteName,
						domain: linkPreview.domain,
					}
				: undefined,
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
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
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

				const images = await ctx.db
					.query("postImages")
					.withIndex("by_postId", (q) => q.eq("postId", post._id))
					.collect();

				const hasLiked = currentUserId
					? likes.some((l) => l.userId === currentUserId)
					: false;

				return {
					...post,
					author: {
						_id: targetUser._id,
						clerkId: targetUser.clerkId,
						username: targetUser.username,
						displayName: targetUser.displayName,
						avatarUrl: targetUser.avatarUrl,
					},
					images: images.map((img) => ({
						url: img.url,
						caption: img.caption,
					})),
					_count: { likes: likes.length, comments: comments.length },
					hasLiked,
				};
			}),
		);

		return { posts, nextCursor };
	},
});

export const updatePost = mutation({
	args: {
		postId: v.id("posts"),
		content: v.string(),
		clerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const post = await ctx.db.get(args.postId);
		if (!post) throw new Error("Post not found");

		const author = await ctx.db.get(post.authorId);
		const requestingUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		const isAdmin = requestingUser?.admin === true;
		if (!author || (author.clerkId !== args.clerkId && !isAdmin)) {
			throw new Error("Unauthorized");
		}

		// Save current content as a version snapshot before patching
		await ctx.db.insert("postVersions", {
			postId: args.postId,
			content: post.content,
			editedAt: Date.now(),
		});

		// When a link preview exists, the URL doesn't count towards the limit
		const linkPreview = await ctx.db
			.query("postLinkPreviews")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.first();
		const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/;
		const urlMatch = linkPreview ? urlRegex.exec(args.content) : null;
		const sliceLimit = urlMatch ? 280 + urlMatch[0].length + 1 : 280;

		await ctx.db.patch(args.postId, {
			content: args.content.slice(0, sliceLimit),
			updatedAt: Date.now(),
			editCount: (post.editCount ?? 0) + 1,
		});

		return args.postId;
	},
});

export const getHistory = query({
	args: { postId: v.id("posts") },
	handler: async (ctx, args) => {
		const post = await ctx.db.get(args.postId);
		if (!post) return null;

		const versions = await ctx.db
			.query("postVersions")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.order("desc")
			.collect();

		return {
			current: {
				content: post.content,
				editedAt: post.updatedAt ?? post._creationTime,
			},
			versions: versions.map((v) => ({
				_id: v._id,
				content: v.content,
				editedAt: v.editedAt,
			})),
		};
	},
});

export const deletePost = mutation({
	args: { postId: v.id("posts"), clerkId: v.string() },
	handler: async (ctx, args) => {
		const post = await ctx.db.get(args.postId);
		if (!post) throw new Error("Post not found");

		const author = await ctx.db.get(post.authorId);
		const requestingUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		const isAdmin = requestingUser?.admin === true;
		if (!author || (author.clerkId !== args.clerkId && !isAdmin)) {
			throw new Error("Unauthorized");
		}

		// Cascade: delete post versions
		const postVersions = await ctx.db
			.query("postVersions")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.collect();
		for (const ver of postVersions) {
			await ctx.db.delete(ver._id);
		}

		// Cascade: delete post images
		const postImages = await ctx.db
			.query("postImages")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.collect();
		for (const img of postImages) {
			await ctx.db.delete(img._id);
		}

		// Cascade: delete link previews
		const linkPreviews = await ctx.db
			.query("postLinkPreviews")
			.withIndex("by_postId", (q) => q.eq("postId", args.postId))
			.collect();
		for (const lp of linkPreviews) {
			await ctx.db.delete(lp._id);
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
