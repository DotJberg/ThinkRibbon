import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
		return { liked: true };
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
