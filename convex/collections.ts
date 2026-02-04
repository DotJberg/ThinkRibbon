import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ownershipType = v.union(
	v.literal("Physical"),
	v.literal("Digital"),
);

const collectionStatus = v.union(
	v.literal("Unplayed"),
	v.literal("Playing"),
	v.literal("Beaten"),
	v.literal("Completed"),
	v.literal("OnHold"),
	v.literal("Dropped"),
	v.literal("Backlog"),
);

// DLC/Expansion/Addon categories that shouldn't be added to collection
const DLC_CATEGORIES = [
	"DLC",
	"Expansion",
	"Standalone Expansion",
	"Bundle",
	"Pack",
	"Pack / Addon",
	"Mod",
	"Update",
];

export const add = mutation({
	args: {
		clerkId: v.string(),
		gameId: v.id("games"),
		ownershipType: ownershipType,
		status: v.optional(collectionStatus),
		platform: v.optional(v.string()),
		difficulty: v.optional(v.string()),
		acquiredAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const game = await ctx.db.get(args.gameId);
		if (!game) throw new Error("Game not found");

		// Block DLC/Expansions from being added to collection
		if (game.categoryLabel && DLC_CATEGORIES.includes(game.categoryLabel)) {
			throw new Error(
				`Cannot add ${game.categoryLabel} to collection. Only main games can be tracked.`,
			);
		}

		// Check if already in collection
		const existing = await ctx.db
			.query("collections")
			.withIndex("by_userId_gameId", (q) =>
				q.eq("userId", user._id).eq("gameId", args.gameId),
			)
			.first();

		if (existing) {
			throw new Error("Game is already in your collection");
		}

		const id = await ctx.db.insert("collections", {
			userId: user._id,
			gameId: args.gameId,
			ownershipType: args.ownershipType,
			status: args.status,
			platform: args.platform,
			difficulty: args.difficulty,
			acquiredAt: args.acquiredAt,
			updatedAt: Date.now(),
		});

		return id;
	},
});

export const update = mutation({
	args: {
		clerkId: v.string(),
		collectionId: v.id("collections"),
		ownershipType: v.optional(ownershipType),
		status: v.optional(collectionStatus),
		platform: v.optional(v.string()),
		difficulty: v.optional(v.string()),
		acquiredAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const collection = await ctx.db.get(args.collectionId);
		if (!collection || collection.userId !== user._id) {
			throw new Error("Unauthorized");
		}

		const updateData: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.ownershipType !== undefined)
			updateData.ownershipType = args.ownershipType;
		if (args.status !== undefined) updateData.status = args.status;
		if (args.platform !== undefined) updateData.platform = args.platform;
		if (args.difficulty !== undefined) updateData.difficulty = args.difficulty;
		if (args.acquiredAt !== undefined) updateData.acquiredAt = args.acquiredAt;

		await ctx.db.patch(args.collectionId, updateData);

		const updated = await ctx.db.get(args.collectionId);
		const game = await ctx.db.get(collection.gameId);
		return { ...updated, game };
	},
});

export const remove = mutation({
	args: { clerkId: v.string(), collectionId: v.id("collections") },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const collection = await ctx.db.get(args.collectionId);
		if (!collection || collection.userId !== user._id) {
			throw new Error("Unauthorized");
		}

		await ctx.db.delete(args.collectionId);
		return { success: true };
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
			.query("collections")
			.withIndex("by_userId_gameId", (q) =>
				q.eq("userId", user._id).eq("gameId", args.gameId),
			)
			.first();

		if (!entry) return null;

		const game = await ctx.db.get(entry.gameId);
		return { ...entry, game };
	},
});

export const getUserCollection = query({
	args: { username: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();

		if (!user) {
			return {
				games: [],
				stats: {
					totalOwned: 0,
					physical: 0,
					digital: 0,
				},
			};
		}

		// Get all collection entries for this user
		const collectionEntries = await ctx.db
			.query("collections")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.collect();

		// Calculate stats
		const stats = {
			totalOwned: collectionEntries.length,
			physical: 0,
			digital: 0,
		};

		for (const entry of collectionEntries) {
			if (entry.ownershipType === "Physical") stats.physical++;
			else if (entry.ownershipType === "Digital") stats.digital++;
		}

		// Get all quest log entries for this user (for playthrough data)
		const questLogEntries = await ctx.db
			.query("questLogs")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.collect();

		// Group quest log entries by gameId
		const playthroughsByGame = new Map<string, typeof questLogEntries>();
		for (const entry of questLogEntries) {
			const gameIdStr = entry.gameId as string;
			if (!playthroughsByGame.has(gameIdStr)) {
				playthroughsByGame.set(gameIdStr, []);
			}
			playthroughsByGame.get(gameIdStr)!.push(entry);
		}

		// Enrich collection entries with game data and playthroughs
		const games = await Promise.all(
			collectionEntries.map(async (entry) => {
				const game = await ctx.db.get(entry.gameId);
				if (!game) return null;

				// Get user's review for this game
				const review = await ctx.db
					.query("reviews")
					.withIndex("by_authorId_gameId", (q) =>
						q.eq("authorId", user._id).eq("gameId", entry.gameId),
					)
					.first();

				// Get playthroughs for this game
				const playthroughs = playthroughsByGame.get(entry.gameId as string) || [];
				const sortedPlaythroughs = playthroughs.sort(
					(a, b) =>
						(b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
				);

				// Get latest status from playthroughs (if any)
				const latestPlaythrough = sortedPlaythroughs[0];

				return {
					collection: {
						_id: entry._id,
						ownershipType: entry.ownershipType,
						status: entry.status || null,
						platform: entry.platform,
						difficulty: entry.difficulty,
						acquiredAt: entry.acquiredAt,
						updatedAt: entry.updatedAt || entry._creationTime,
					},
					game: {
						_id: game._id,
						name: game.name,
						slug: game.slug,
						coverUrl: game.coverUrl,
						releaseDate: game.releaseDate,
						genres: game.genres,
						platforms: game.platforms,
					},
					playthroughs: sortedPlaythroughs.map((p) => ({
						_id: p._id,
						status: p.status,
						platform: p.platform,
						difficulty: p.difficulty,
						startedAt: p.startedAt,
						completedAt: p.completedAt,
						quickRating: p.quickRating,
						hoursPlayed: p.hoursPlayed,
						notes: p.notes,
						updatedAt: p.updatedAt || p._creationTime,
					})),
					latestRating: latestPlaythrough?.quickRating || null,
					review: review
						? {
								_id: review._id,
								title: review.title,
								rating: review.rating,
								published: review.published,
							}
						: null,
				};
			}),
		);

		// Filter nulls and sort by most recently updated
		const validGames = games
			.filter((g) => g !== null)
			.sort((a, b) => b.collection.updatedAt - a.collection.updatedAt);

		return { games: validGames, stats };
	},
});

// Stats for collection including playthrough status breakdown
export const getCollectionStats = query({
	args: { username: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();

		if (!user) {
			return {
				totalOwned: 0,
				physical: 0,
				digital: 0,
				playing: 0,
				beaten: 0,
				completed: 0,
				dropped: 0,
				backlog: 0,
				onHold: 0,
				unplayed: 0,
			};
		}

		// Get all collection entries
		const collectionEntries = await ctx.db
			.query("collections")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.collect();

		// Calculate stats
		const stats = {
			totalOwned: collectionEntries.length,
			physical: 0,
			digital: 0,
			playing: 0,
			beaten: 0,
			completed: 0,
			dropped: 0,
			backlog: 0,
			onHold: 0,
			unplayed: 0,
		};

		for (const entry of collectionEntries) {
			// Ownership stats
			if (entry.ownershipType === "Physical") stats.physical++;
			else if (entry.ownershipType === "Digital") stats.digital++;

			// Status stats (based on collection status)
			const status = entry.status;
			if (!status || status === "Unplayed") {
				stats.unplayed++;
			} else {
				switch (status) {
					case "Playing":
						stats.playing++;
						break;
					case "Beaten":
						stats.beaten++;
						break;
					case "Completed":
						stats.completed++;
						break;
					case "Dropped":
						stats.dropped++;
						break;
					case "Backlog":
						stats.backlog++;
						break;
					case "OnHold":
						stats.onHold++;
						break;
				}
			}
		}

		return stats;
	},
});
