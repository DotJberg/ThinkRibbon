import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const questLogStatus = v.union(
	v.literal("Playing"),
	v.literal("Completed"),
	v.literal("OnHold"),
	v.literal("Dropped"),
	v.literal("Backlog"),
);

export const add = mutation({
	args: {
		clerkId: v.string(),
		gameId: v.id("games"),
		status: v.optional(questLogStatus),
		startedAt: v.optional(v.number()),
		completedAt: v.optional(v.number()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const game = await ctx.db.get(args.gameId);
		if (!game) throw new Error("Game not found");

		// Count displayed games for ordering
		const displayed = await ctx.db
			.query("questLogs")
			.withIndex("by_userId_display", (q) =>
				q.eq("userId", user._id).eq("displayOnProfile", true),
			)
			.collect();

		const id = await ctx.db.insert("questLogs", {
			userId: user._id,
			gameId: args.gameId,
			status: args.status || "Playing",
			startedAt: args.startedAt || Date.now(),
			completedAt: args.completedAt,
			notes: args.notes,
			displayOnProfile: true,
			displayOrder: Math.min(displayed.length, 4),
			updatedAt: Date.now(),
		});

		return id;
	},
});

export const getEntry = query({
	args: { clerkId: v.string(), gameId: v.id("games") },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return null;

		const entry = await ctx.db
			.query("questLogs")
			.withIndex("by_userId_gameId", (q) =>
				q.eq("userId", user._id).eq("gameId", args.gameId),
			)
			.first();

		if (!entry) return null;

		const game = await ctx.db.get(entry.gameId);
		return { ...entry, game };
	},
});

export const update = mutation({
	args: {
		clerkId: v.string(),
		questLogId: v.id("questLogs"),
		status: v.optional(questLogStatus),
		notes: v.optional(v.string()),
		hoursPlayed: v.optional(v.number()),
		startedAt: v.optional(v.number()),
		completedAt: v.optional(v.number()),
		displayOnProfile: v.optional(v.boolean()),
		displayOrder: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const questLog = await ctx.db.get(args.questLogId);
		if (!questLog || questLog.userId !== user._id) {
			throw new Error("Unauthorized");
		}

		const updateData: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.status !== undefined) updateData.status = args.status;
		if (args.notes !== undefined) updateData.notes = args.notes;
		if (args.hoursPlayed !== undefined) updateData.hoursPlayed = args.hoursPlayed;
		if (args.startedAt !== undefined) updateData.startedAt = args.startedAt;
		if (args.completedAt !== undefined) updateData.completedAt = args.completedAt;
		if (args.displayOnProfile !== undefined) updateData.displayOnProfile = args.displayOnProfile;
		if (args.displayOrder !== undefined) updateData.displayOrder = args.displayOrder;

		// Auto-set completedAt
		if (
			(args.status === "Completed" || args.status === "Dropped") &&
			args.completedAt === undefined
		) {
			updateData.completedAt = Date.now();
		}

		await ctx.db.patch(args.questLogId, updateData);

		const updated = await ctx.db.get(args.questLogId);
		const game = await ctx.db.get(questLog.gameId);
		return { ...updated, game };
	},
});

export const updateStatus = mutation({
	args: {
		clerkId: v.string(),
		gameId: v.id("games"),
		newStatus: questLogStatus,
		quickRating: v.optional(v.number()),
		shareAsPost: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const questLog = await ctx.db
			.query("questLogs")
			.withIndex("by_userId_gameId", (q) =>
				q.eq("userId", user._id).eq("gameId", args.gameId),
			)
			.first();
		if (!questLog) throw new Error("Quest log entry not found");

		const game = await ctx.db.get(args.gameId);

		await ctx.db.patch(questLog._id, {
			status: args.newStatus,
			quickRating: args.quickRating,
			completedAt:
				args.newStatus === "Completed" || args.newStatus === "Dropped"
					? Date.now()
					: questLog.completedAt,
			updatedAt: Date.now(),
		});

		// Generate post if requested
		if (args.shareAsPost && args.quickRating && game) {
			const statusText = getStatusText(args.newStatus);
			const stars = "\u2B50".repeat(args.quickRating);
			const content = `I just ${statusText} ${game.name}! ${stars}`;

			await ctx.db.insert("posts", {
				content: content.slice(0, 280),
				authorId: user._id,
				updatedAt: Date.now(),
			});
		}

		const updated = await ctx.db.get(questLog._id);
		return { ...updated, game };
	},
});

export const remove = mutation({
	args: { clerkId: v.string(), questLogId: v.id("questLogs") },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const questLog = await ctx.db.get(args.questLogId);
		if (!questLog || questLog.userId !== user._id) {
			throw new Error("Unauthorized");
		}

		await ctx.db.delete(args.questLogId);
		return { success: true };
	},
});

export const getNowPlaying = query({
	args: { username: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();
		if (!user) return [];

		const entries = await ctx.db
			.query("questLogs")
			.withIndex("by_userId_display", (q) =>
				q.eq("userId", user._id).eq("displayOnProfile", true),
			)
			.collect();

		// Filter to Playing status, sort by display order, take 5
		const playing = entries
			.filter((e) => e.status === "Playing")
			.sort((a, b) => a.displayOrder - b.displayOrder)
			.slice(0, 5);

		return Promise.all(
			playing.map(async (entry) => {
				const game = await ctx.db.get(entry.gameId);
				return { ...entry, game };
			}),
		);
	},
});

export const getUserQuestLog = query({
	args: {
		username: v.string(),
		status: v.optional(questLogStatus),
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		const user = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();
		if (!user) return { entries: [], nextCursor: undefined };

		let entries;
		if (args.status) {
			entries = await ctx.db
				.query("questLogs")
				.withIndex("by_userId_status", (q) =>
					q.eq("userId", user._id).eq("status", args.status!),
				)
				.collect();
		} else {
			entries = await ctx.db
				.query("questLogs")
				.withIndex("by_userId", (q) => q.eq("userId", user._id))
				.collect();
		}

		// Sort by updatedAt desc
		entries.sort(
			(a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		// Apply cursor
		let startIdx = 0;
		if (args.cursor) {
			const idx = entries.findIndex((e) => e._id === args.cursor);
			if (idx !== -1) startIdx = idx + 1;
		}

		const paginated = entries.slice(startIdx, startIdx + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		const enriched = await Promise.all(
			paginated.map(async (entry) => {
				const game = await ctx.db.get(entry.gameId);
				return { ...entry, game };
			}),
		);

		return { entries: enriched, nextCursor };
	},
});

export const getTimeline = query({
	args: {
		username: v.string(),
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		const user = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();
		if (!user) return { entries: [], nextCursor: undefined };

		let entries = await ctx.db
			.query("questLogs")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.collect();

		entries.sort(
			(a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		let startIdx = 0;
		if (args.cursor) {
			const idx = entries.findIndex((e) => e._id === args.cursor);
			if (idx !== -1) startIdx = idx + 1;
		}

		const paginated = entries.slice(startIdx, startIdx + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		const enriched = await Promise.all(
			paginated.map(async (entry) => {
				const game = await ctx.db.get(entry.gameId);
				return { ...entry, game };
			}),
		);

		return { entries: enriched, nextCursor };
	},
});

export const updateDisplayOrder = mutation({
	args: { clerkId: v.string(), orderedIds: v.array(v.id("questLogs")) },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		for (let i = 0; i < Math.min(args.orderedIds.length, 5); i++) {
			const entry = await ctx.db.get(args.orderedIds[i]);
			if (entry && entry.userId === user._id) {
				await ctx.db.patch(args.orderedIds[i], {
					displayOrder: i,
					updatedAt: Date.now(),
				});
			}
		}

		return { success: true };
	},
});

export const getCombinedRating = query({
	args: { gameId: v.id("games") },
	handler: async (ctx, args) => {
		const reviews = await ctx.db
			.query("reviews")
			.withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
			.collect();
		const published = reviews.filter((r) => r.published);

		const questLogs = await ctx.db
			.query("questLogs")
			.withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
			.collect();
		const withRating = questLogs.filter((q) => q.quickRating != null);

		const reviewCount = published.length;
		const quickCount = withRating.length;
		const totalCount = reviewCount + quickCount;

		if (totalCount === 0) return { averageRating: null, totalRatings: 0 };

		const reviewSum = published.reduce((acc, r) => acc + r.rating, 0);
		const quickSum = withRating.reduce((acc, q) => acc + (q.quickRating || 0), 0);

		const reviewAvg = reviewCount > 0 ? reviewSum / reviewCount : 0;
		const quickAvg = quickCount > 0 ? quickSum / quickCount : 0;

		const averageRating =
			(reviewAvg * reviewCount + quickAvg * quickCount) / totalCount;

		return {
			averageRating: Math.round(averageRating * 10) / 10,
			totalRatings: totalCount,
			reviewCount,
			quickRatingCount: quickCount,
		};
	},
});

function getStatusText(status: string): string {
	switch (status) {
		case "Completed":
			return "completed";
		case "Dropped":
			return "dropped";
		case "OnHold":
			return "put on hold";
		case "Playing":
			return "started playing";
		case "Backlog":
			return "added to backlog";
		default:
			return "updated";
	}
}
