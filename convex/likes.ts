import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { createNotification } from "./notifications";

export const toggle = mutation({
	args: {
		clerkId: v.string(),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
			v.literal("comment"),
		),
		targetId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const existing = await ctx.db
			.query("likes")
			.withIndex("by_user_target", (q) =>
				q
					.eq("userId", user._id)
					.eq("targetType", args.targetType)
					.eq("targetId", args.targetId),
			)
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
			return { liked: false };
		}

		await ctx.db.insert("likes", {
			userId: user._id,
			targetType: args.targetType,
			targetId: args.targetId,
		});

		// Create notification for the content owner
		const typeMap = {
			post: "like_post",
			article: "like_article",
			review: "like_review",
			comment: "like_comment",
		} as const;

		let ownerId: Id<"users"> | null = null;
		if (args.targetType === "comment") {
			const comment = await ctx.db.get(
				args.targetId as Id<"comments">,
			);
			ownerId = comment?.authorId ?? null;
		} else if (args.targetType === "post") {
			const post = await ctx.db.get(args.targetId as Id<"posts">);
			ownerId = post?.authorId ?? null;
		} else if (args.targetType === "article") {
			const article = await ctx.db.get(
				args.targetId as Id<"articles">,
			);
			ownerId = article?.authorId ?? null;
		} else if (args.targetType === "review") {
			const review = await ctx.db.get(
				args.targetId as Id<"reviews">,
			);
			ownerId = review?.authorId ?? null;
		}

		if (ownerId) {
			await createNotification(
				ctx,
				ownerId,
				user._id,
				typeMap[args.targetType],
				args.targetId,
			);
		}

		return { liked: true };
	},
});

export const getLikers = query({
	args: {
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
			v.literal("comment"),
		),
		targetId: v.string(),
	},
	handler: async (ctx, args) => {
		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", args.targetType).eq("targetId", args.targetId),
			)
			.collect();

		const users = await Promise.all(
			likes.map(async (like) => {
				const user = await ctx.db.get(like.userId);
				if (!user) return null;
				return {
					_id: user._id,
					username: user.username,
					displayName: user.displayName,
					avatarUrl: user.avatarUrl,
				};
			}),
		);

		return users.filter((u) => u !== null);
	},
});

export const hasLiked = query({
	args: {
		clerkId: v.string(),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
			v.literal("comment"),
		),
		targetId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return false;

		const like = await ctx.db
			.query("likes")
			.withIndex("by_user_target", (q) =>
				q
					.eq("userId", user._id)
					.eq("targetType", args.targetType)
					.eq("targetId", args.targetId),
			)
			.unique();

		return !!like;
	},
});
