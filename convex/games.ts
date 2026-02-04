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
		hypes: v.optional(v.number()),
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

export const getById = query({
	args: { gameId: v.id("games") },
	handler: async (ctx, args) => {
		return ctx.db.get(args.gameId);
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

		// Batch fetch all data upfront to avoid N+1 queries
		const [allGames, allReviews, allQuestLogs] = await Promise.all([
			ctx.db.query("games").collect(),
			ctx.db.query("reviews").collect(),
			ctx.db.query("questLogs").collect(),
		]);

		// Build maps for reviews and quest logs by gameId
		const reviewsByGameId = new Map<string, typeof allReviews>();
		for (const review of allReviews) {
			if (review.published) {
				const gameId = review.gameId as string;
				if (!reviewsByGameId.has(gameId)) reviewsByGameId.set(gameId, []);
				reviewsByGameId.get(gameId)!.push(review);
			}
		}

		const questLogsByGameId = new Map<string, typeof allQuestLogs>();
		for (const questLog of allQuestLogs) {
			if (questLog.quickRating != null) {
				const gameId = questLog.gameId as string;
				if (!questLogsByGameId.has(gameId)) questLogsByGameId.set(gameId, []);
				questLogsByGameId.get(gameId)!.push(questLog);
			}
		}

		// Filter to games that have at least one rating (full review or quick rating)
		const gamesWithRatings = [];
		for (const game of allGames) {
			const publishedReviews = reviewsByGameId.get(game._id as string) || [];
			const withQuickRating = questLogsByGameId.get(game._id as string) || [];

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

		// Batch fetch all data upfront to avoid N+1 queries
		const [allGames, allReviews, allQuestLogs] = await Promise.all([
			ctx.db.query("games").collect(),
			ctx.db.query("reviews").collect(),
			ctx.db.query("questLogs").collect(),
		]);

		// Build maps for reviews and quest logs by gameId
		const reviewsByGameId = new Map<string, typeof allReviews>();
		for (const review of allReviews) {
			if (review.published) {
				const gameId = review.gameId as string;
				if (!reviewsByGameId.has(gameId)) reviewsByGameId.set(gameId, []);
				reviewsByGameId.get(gameId)!.push(review);
			}
		}

		const questLogsByGameId = new Map<string, typeof allQuestLogs>();
		for (const questLog of allQuestLogs) {
			if (questLog.quickRating != null) {
				const gameId = questLog.gameId as string;
				if (!questLogsByGameId.has(gameId)) questLogsByGameId.set(gameId, []);
				questLogsByGameId.get(gameId)!.push(questLog);
			}
		}

		const gamesWithRatings = [];
		for (const game of allGames) {
			const published = reviewsByGameId.get(game._id as string) || [];
			const withQuickRating = questLogsByGameId.get(game._id as string) || [];

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

// Get upcoming games (release date in the future), sorted by hypes within each month
export const getUpcoming = query({
	args: {
		limitPerMonth: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const limitPerMonth = args.limitPerMonth ?? 6;

		const allGames = await ctx.db.query("games").collect();

		// Filter to games with future release dates
		const upcomingGames = allGames
			.filter((game) => game.releaseDate && game.releaseDate > now)
			.sort((a, b) => (b.hypes || 0) - (a.hypes || 0)); // Sort by hypes desc

		// Group by month and limit per month
		const gamesByMonth: Record<string, typeof upcomingGames> = {};
		const monthTotals: Record<string, number> = {};

		for (const game of upcomingGames) {
			const date = new Date(game.releaseDate!);
			// Use UTC to avoid timezone inconsistencies with client
			const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

			if (!gamesByMonth[monthKey]) {
				gamesByMonth[monthKey] = [];
				monthTotals[monthKey] = 0;
			}

			monthTotals[monthKey]++;

			if (gamesByMonth[monthKey].length < limitPerMonth) {
				gamesByMonth[monthKey].push(game);
			}
		}

		// Flatten back to array, sorted by release date
		const limitedGames = Object.entries(gamesByMonth)
			.sort(([a], [b]) => a.localeCompare(b))
			.flatMap(([_, games]) =>
				games.sort((a, b) => (a.releaseDate || 0) - (b.releaseDate || 0)),
			);

		return { games: limitedGames, monthTotals };
	},
});

// Get upcoming games for a specific month
export const getUpcomingByMonth = query({
	args: {
		year: v.number(),
		month: v.number(), // 1-12
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		// Calculate month boundaries in UTC
		const monthStart = Date.UTC(args.year, args.month - 1, 1);
		const monthEnd = Date.UTC(args.year, args.month, 0, 23, 59, 59, 999);

		const allGames = await ctx.db.query("games").collect();

		// Filter to games in this month
		const monthGames = allGames
			.filter(
				(game) =>
					game.releaseDate &&
					game.releaseDate >= monthStart &&
					game.releaseDate <= monthEnd,
			)
			.sort((a, b) => (b.hypes || 0) - (a.hypes || 0)); // Sort by hypes desc

		// Apply cursor
		let startIdx = 0;
		if (args.cursor) {
			const idx = monthGames.findIndex((g) => g._id === args.cursor);
			if (idx !== -1) startIdx = idx + 1;
		}

		const paginated = monthGames.slice(startIdx, startIdx + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		return { games: paginated, nextCursor, total: monthGames.length };
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
