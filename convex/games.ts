import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

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

		// Filter to games that have at least one published review
		const gamesWithReviews = [];
		for (const game of allGames) {
			const reviews = await ctx.db
				.query("reviews")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.collect();
			const publishedReviews = reviews.filter((r) => r.published);
			if (publishedReviews.length > 0) {
				const sum = publishedReviews.reduce((acc, r) => acc + r.rating, 0);
				gamesWithReviews.push({
					...game,
					_count: { reviews: publishedReviews.length },
					averageRating: sum / publishedReviews.length,
				});
			}
		}

		// Sort by updatedAt desc
		gamesWithReviews.sort(
			(a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
		);

		// Apply cursor
		let startIdx = 0;
		if (args.cursor) {
			const idx = gamesWithReviews.findIndex((g) => g._id === args.cursor);
			if (idx !== -1) startIdx = idx + 1;
		}

		const paginated = gamesWithReviews.slice(startIdx, startIdx + limit + 1);
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
			const reviews = await ctx.db
				.query("reviews")
				.withIndex("by_gameId", (q) => q.eq("gameId", game._id))
				.collect();
			const published = reviews.filter((r) => r.published);
			if (published.length > 0) {
				const sum = published.reduce((acc, r) => acc + r.rating, 0);
				gamesWithRatings.push({
					...game,
					_count: { reviews: published.length },
					averageRating: sum / published.length,
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
