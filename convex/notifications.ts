import { v } from "convex/values";
import {
	internalMutation,
	mutation,
	query,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const notificationType = v.union(
	v.literal("like_post"),
	v.literal("like_article"),
	v.literal("like_review"),
	v.literal("like_comment"),
	v.literal("comment_post"),
	v.literal("comment_article"),
	v.literal("comment_review"),
	v.literal("reply_comment"),
	v.literal("mention_post"),
	v.literal("mention_article"),
	v.literal("mention_review"),
);

export const getUnreadCount = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return 0;

		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.filter((q) => q.eq(q.field("viewedAt"), undefined))
			.collect();

		return unread.length;
	},
});

export const getAll = query({
	args: { clerkId: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return [];

		const limit = args.limit || 30;
		const notifications = await ctx.db
			.query("notifications")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.order("desc")
			.take(limit);

		const enriched = await Promise.all(
			notifications.map(async (n) => {
				const actor = await ctx.db.get(n.actorId);
				return {
					...n,
					actor: actor
						? {
								_id: actor._id,
								username: actor.username,
								displayName: actor.displayName,
								avatarUrl: actor.avatarUrl,
							}
						: null,
				};
			}),
		);

		return enriched;
	},
});

export const markAllViewed = mutation({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return;

		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.filter((q) => q.eq(q.field("viewedAt"), undefined))
			.collect();

		const now = Date.now();
		for (const n of unread) {
			await ctx.db.patch(n._id, { viewedAt: now });
		}
	},
});

export async function createNotification(
	ctx: MutationCtx,
	userId: Id<"users">,
	actorId: Id<"users">,
	type: typeof notificationType.type,
	targetId: string,
) {
	if (userId === actorId) return;
	await ctx.db.insert("notifications", {
		userId,
		actorId,
		type,
		targetId,
	});
}

export const cleanup = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const oneDayMs = 24 * 60 * 60 * 1000;
		const thirtyDaysMs = 30 * oneDayMs;

		// Delete viewed notifications older than 24 hours
		const allNotifications = await ctx.db
			.query("notifications")
			.collect();

		let deleted = 0;
		for (const n of allNotifications) {
			const shouldDelete =
				(n.viewedAt !== undefined && now - n.viewedAt > oneDayMs) ||
				(n.viewedAt === undefined && now - n._creationTime > thirtyDaysMs);

			if (shouldDelete) {
				await ctx.db.delete(n._id);
				deleted++;
			}
		}

		if (deleted > 0) {
			console.log(`Cleaned up ${deleted} expired notifications`);
		}
	},
});
