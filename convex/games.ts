import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const upsertFromIgdb = internalMutation({
	args: {
		igdbId: v.number(),
		name: v.string(),
		slug: v.string(),
		summary: v.optional(v.string()),
		coverUrl: v.optional(v.string()),
		releaseDate: v.optional(v.number()),
		genres: v.array(v.string()),
		platforms: v.array(v.string()),
		rating: v.optional(v.number()),
		categoryLabel: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("games")
			.withIndex("by_igdbId", (q) => q.eq("igdbId", args.igdbId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				...args,
				cachedAt: Date.now(),
				updatedAt: Date.now(),
			});
			return existing._id;
		}

		return ctx.db.insert("games", {
			...args,
			cachedAt: Date.now(),
			updatedAt: Date.now(),
		});
	},
});

export const getBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		return ctx.db
			.query("games")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();
	},
});

export const getWithReviews = query({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		const allGames = await ctx.db.query("games").collect();

		// Filter to games that have at least one rating (full review or quick rating)
		const gamesWithRatings = [];
		for (const game of allGames) {
			// Get full reviews
			const reviews = await ctx.db
				.query("reviews")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.collect();
			const publishedReviews = reviews.filter((r) => r.published);

			// Get quick ratings from quest logs
			const questLogs = await ctx.db
				.query("questLogs")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.collect();
			const withQuickRating = questLogs.filter((q) => q.quickRating != null);

			const reviewCount = publishedReviews.length;
			const quickCount = withQuickRating.length;
			const totalCount = reviewCount + quickCount;

			if (totalCount > 0) {
				const reviewSum = publishedReviews.reduce((acc, r) => acc + r.rating, 0);
				const quickSum = withQuickRating.reduce(
					(acc, q) => acc + (q.quickRating || 0),
					0,
				);

				const reviewAvg = reviewCount > 0 ? reviewSum / reviewCount : 0;
				const quickAvg = quickCount > 0 ? quickSum / quickCount : 0;

				const averageRating =
					(reviewAvg * reviewCount + quickAvg * quickCount) / totalCount;

				gamesWithRatings.push({
					...game,
					_count: { reviews: totalCount },
					averageRating: Math.round(averageRating * 10) / 10,
				});
			}
		}

		// Sort by updatedAt desc
		gamesWithRatings.sort(
			(a, b) =>
				(b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		// Apply cursor
		let startIdx = 0;
		if (args.cursor) {
			const idx = gamesWithRatings.findIndex((g) => g._id === args.cursor);
			if (idx !== -1) startIdx = idx + 1;
		}

		const paginated = gamesWithRatings.slice(startIdx, startIdx + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		return { games: paginated, nextCursor };
	},
});

export const getHighestRated = query({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		const allGames = await ctx.db.query("games").collect();

		const gamesWithRatings = [];
		for (const game of allGames) {
			// Get full reviews
			const reviews = await ctx.db
				.query("reviews")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.collect();
			const published = reviews.filter((r) => r.published);

			// Get quick ratings from quest logs
			const questLogs = await ctx.db
				.query("questLogs")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.collect();
			const withQuickRating = questLogs.filter((q) => q.quickRating != null);

			const reviewCount = published.length;
			const quickCount = withQuickRating.length;
			const totalCount = reviewCount + quickCount;

			if (totalCount > 0) {
				const reviewSum = published.reduce((acc, r) => acc + r.rating, 0);
				const quickSum = withQuickRating.reduce(
					(acc, q) => acc + (q.quickRating || 0),
					0,
				);

				const reviewAvg = reviewCount > 0 ? reviewSum / reviewCount : 0;
				const quickAvg = quickCount > 0 ? quickSum / quickCount : 0;

				const averageRating =
					(reviewAvg * reviewCount + quickAvg * quickCount) / totalCount;

				gamesWithRatings.push({
					...game,
					_count: { reviews: totalCount },
					averageRating: Math.round(averageRating * 10) / 10,
				});
			}
		}

		// Sort by average rating desc
		gamesWithRatings.sort((a, b) => b.averageRating - a.averageRating);

		let startIdx = 0;
		if (args.cursor) {
			const idx = gamesWithRatings.findIndex((g) => g._id === args.cursor);
			if (idx !== -1) startIdx = idx + 1;
		}

		const paginated = gamesWithRatings.slice(startIdx, startIdx + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		return { games: paginated, nextCursor };
	},
});

// Cleanup orphaned games that aren't referenced by any other table
// and were cached more than `maxAgeDays` days ago
export const cleanupOrphanedGames = mutation({
	args: {
		maxAgeDays: v.optional(v.number()),
		dryRun: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const maxAgeDays = args.maxAgeDays ?? 14;
		const dryRun = args.dryRun ?? false;
		const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

		const allGames = await ctx.db.query("games").collect();

		const orphanedGames = [];
		for (const game of allGames) {
			// Skip games that were cached recently
			if (game.cachedAt > cutoffTime) continue;

			// Check if game is referenced by reviews
			const hasReviews = await ctx.db
				.query("reviews")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.first();
			if (hasReviews) continue;

			// Check if game is in any quest log
			const hasQuestLog = await ctx.db
				.query("questLogs")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.first();
			if (hasQuestLog) continue;

			// Check if game is tagged in any article
			const hasArticle = await ctx.db
				.query("articleGames")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.first();
			if (hasArticle) continue;

			// This game is orphaned
			orphanedGames.push(game);
		}

		// Delete orphaned games (unless dry run)
		if (!dryRun) {
			for (const game of orphanedGames) {
				await ctx.db.delete(game._id);
			}
		}

		return {
			totalGames: allGames.length,
			orphanedCount: orphanedGames.length,
			deleted: dryRun ? 0 : orphanedGames.length,
			dryRun,
			orphanedGames: orphanedGames.map((g) => ({
				name: g.name,
				cachedAt: new Date(g.cachedAt).toISOString(),
			})),
		};
	},
});
