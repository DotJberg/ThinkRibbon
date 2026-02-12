import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
		username: v.string(),
		displayName: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if user exists by clerkId
		const existingByClerkId = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (existingByClerkId) {
			const shouldUpdateAvatar =
				!existingByClerkId.avatarUrl ||
				existingByClerkId.avatarUrl.includes("clerk.com") ||
				existingByClerkId.avatarUrl.includes("clerk.dev");

			await ctx.db.patch(existingByClerkId._id, {
				email: args.email,
				...(shouldUpdateAvatar && args.avatarUrl
					? { avatarUrl: args.avatarUrl }
					: {}),
				updatedAt: Date.now(),
			});
			return existingByClerkId._id;
		}

		// Check if user exists by email
		const existingByEmail = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.unique();

		if (existingByEmail) {
			const shouldUpdateAvatar =
				!existingByEmail.avatarUrl ||
				existingByEmail.avatarUrl.includes("clerk.com") ||
				existingByEmail.avatarUrl.includes("clerk.dev");

			await ctx.db.patch(existingByEmail._id, {
				clerkId: args.clerkId,
				...(shouldUpdateAvatar && args.avatarUrl
					? { avatarUrl: args.avatarUrl }
					: {}),
				updatedAt: Date.now(),
			});
			return existingByEmail._id;
		}

		// Create new user
		return ctx.db.insert("users", {
			clerkId: args.clerkId,
			email: args.email,
			username: args.username,
			displayName: args.username,
			avatarUrl: args.avatarUrl,
			updatedAt: Date.now(),
		});
	},
});

export const getByClerkId = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		return ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
	},
});

export const getByUsername = query({
	args: { username: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();

		if (!user) return null;

		// Count posts, published articles, published reviews
		const posts = await ctx.db
			.query("posts")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();

		const articles = await ctx.db
			.query("articles")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();
		const publishedArticles = articles.filter((a) => a.published);

		const reviews = await ctx.db
			.query("reviews")
			.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
			.collect();
		const publishedReviews = reviews.filter((r) => r.published);

		return {
			...user,
			_count: {
				posts: posts.length,
				articles: publishedArticles.length,
				reviews: publishedReviews.length,
			},
		};
	},
});

export const updateProfile = mutation({
	args: {
		clerkId: v.string(),
		displayName: v.optional(v.string()),
		bio: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		bannerUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		await ctx.db.patch(user._id, {
			displayName: args.displayName,
			bio: args.bio,
			avatarUrl: args.avatarUrl,
			bannerUrl: args.bannerUrl,
			updatedAt: Date.now(),
		});
		return user._id;
	},
});

export const adminUpdateProfile = mutation({
	args: {
		clerkId: v.string(),
		userId: v.id("users"),
		displayName: v.optional(v.string()),
		bio: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const admin = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!admin || !admin.admin) throw new Error("Unauthorized");

		const target = await ctx.db.get(args.userId);
		if (!target) throw new Error("User not found");

		await ctx.db.patch(args.userId, {
			...(args.displayName !== undefined
				? { displayName: args.displayName }
				: {}),
			...(args.bio !== undefined ? { bio: args.bio } : {}),
			updatedAt: Date.now(),
		});
		return args.userId;
	},
});

export const checkUsernameAvailable = query({
	args: { username: v.string() },
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();
		return !existing;
	},
});

export const followUser = mutation({
	args: { clerkId: v.string(), targetUserId: v.id("users") },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");
		if (user._id === args.targetUserId)
			throw new Error("Cannot follow yourself");

		// Check for existing follow
		const existing = await ctx.db
			.query("follows")
			.withIndex("by_pair", (q) =>
				q.eq("followerId", user._id).eq("followingId", args.targetUserId),
			)
			.unique();
		if (existing) return { success: true };

		await ctx.db.insert("follows", {
			followerId: user._id,
			followingId: args.targetUserId,
		});
		return { success: true };
	},
});

export const unfollowUser = mutation({
	args: { clerkId: v.string(), targetUserId: v.id("users") },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const follow = await ctx.db
			.query("follows")
			.withIndex("by_pair", (q) =>
				q.eq("followerId", user._id).eq("followingId", args.targetUserId),
			)
			.unique();

		if (follow) {
			await ctx.db.delete(follow._id);
		}
		return { success: true };
	},
});

export const isFollowing = query({
	args: { clerkId: v.string(), targetUserId: v.id("users") },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return false;

		const follow = await ctx.db
			.query("follows")
			.withIndex("by_pair", (q) =>
				q.eq("followerId", user._id).eq("followingId", args.targetUserId),
			)
			.unique();
		return !!follow;
	},
});

export const getFollowCounts = query({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const followers = await ctx.db
			.query("follows")
			.withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
			.collect();

		const following = await ctx.db
			.query("follows")
			.withIndex("by_followerId", (q) => q.eq("followerId", args.userId))
			.collect();

		return { followers: followers.length, following: following.length };
	},
});

export const getFollowersList = query({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const follows = await ctx.db
			.query("follows")
			.withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
			.collect();

		const users = await Promise.all(
			follows.map((f) => ctx.db.get(f.followerId)),
		);

		return users
			.filter((u) => u !== null)
			.map((u) => ({
				_id: u._id,
				username: u.username,
				displayName: u.displayName,
				avatarUrl: u.avatarUrl,
			}));
	},
});

export const getFollowingList = query({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const follows = await ctx.db
			.query("follows")
			.withIndex("by_followerId", (q) => q.eq("followerId", args.userId))
			.collect();

		const users = await Promise.all(
			follows.map((f) => ctx.db.get(f.followingId)),
		);

		return users
			.filter((u) => u !== null)
			.map((u) => ({
				_id: u._id,
				username: u.username,
				displayName: u.displayName,
				avatarUrl: u.avatarUrl,
			}));
	},
});

export const isAdmin = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		return user?.admin === true;
	},
});

// Get users for discovery page with stats
export const getDiscoverUsers = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		// Get all users
		const allUsers = await ctx.db.query("users").collect();

		// Shuffle for randomness using Fisher-Yates
		const shuffled = [...allUsers];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		const users = shuffled.slice(0, limit);

		// Batch fetch all related data upfront to avoid N+1 queries
		const [allReviews, allArticles, allPosts, allCollections, allQuestLogs, allFollows] =
			await Promise.all([
				ctx.db.query("reviews").collect(),
				ctx.db.query("articles").collect(),
				ctx.db.query("posts").collect(),
				ctx.db.query("collections").collect(),
				ctx.db.query("questLogs").collect(),
				ctx.db.query("follows").collect(),
			]);

		// Build count maps by userId
		const reviewCountByUser = new Map<string, number>();
		for (const review of allReviews) {
			if (review.published) {
				const authorId = review.authorId as string;
				reviewCountByUser.set(authorId, (reviewCountByUser.get(authorId) || 0) + 1);
			}
		}

		const articleCountByUser = new Map<string, number>();
		for (const article of allArticles) {
			if (article.published) {
				const authorId = article.authorId as string;
				articleCountByUser.set(authorId, (articleCountByUser.get(authorId) || 0) + 1);
			}
		}

		const postCountByUser = new Map<string, number>();
		for (const post of allPosts) {
			const authorId = post.authorId as string;
			postCountByUser.set(authorId, (postCountByUser.get(authorId) || 0) + 1);
		}

		const collectionCountByUser = new Map<string, number>();
		for (const collection of allCollections) {
			const userId = collection.userId as string;
			collectionCountByUser.set(userId, (collectionCountByUser.get(userId) || 0) + 1);
		}

		const questLogCountByUser = new Map<string, number>();
		for (const questLog of allQuestLogs) {
			if (questLog.status !== "Playing") continue;
			const userId = questLog.userId as string;
			questLogCountByUser.set(userId, (questLogCountByUser.get(userId) || 0) + 1);
		}

		const followerCountByUser = new Map<string, number>();
		for (const follow of allFollows) {
			const followingId = follow.followingId as string;
			followerCountByUser.set(followingId, (followerCountByUser.get(followingId) || 0) + 1);
		}

		// Enrich users from pre-computed maps
		const enriched = users.map((user) => {
			const id = user._id as string;
			return {
				_id: user._id,
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
				bio: user.bio,
				_count: {
					reviews: reviewCountByUser.get(id) || 0,
					articles: articleCountByUser.get(id) || 0,
					posts: postCountByUser.get(id) || 0,
					collection: collectionCountByUser.get(id) || 0,
					questLog: questLogCountByUser.get(id) || 0,
					followers: followerCountByUser.get(id) || 0,
				},
			};
		});

		return enriched;
	},
});

// Lightweight user search for mention autocomplete
export const searchUsersLight = query({
	args: { query: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const limit = args.limit || 10;
		const searchQuery = args.query.toLowerCase().trim();

		if (!searchQuery) return [];

		const allUsers = await ctx.db.query("users").collect();

		return allUsers
			.filter((user) => {
				const username = user.username.toLowerCase();
				const displayName = (user.displayName || "").toLowerCase();
				return (
					username.includes(searchQuery) ||
					displayName.includes(searchQuery)
				);
			})
			.sort((a, b) => {
				const aUsername = a.username.toLowerCase();
				const bUsername = b.username.toLowerCase();

				if (aUsername === searchQuery) return -1;
				if (bUsername === searchQuery) return 1;
				if (
					aUsername.startsWith(searchQuery) &&
					!bUsername.startsWith(searchQuery)
				)
					return -1;
				if (
					bUsername.startsWith(searchQuery) &&
					!aUsername.startsWith(searchQuery)
				)
					return 1;
				return 0;
			})
			.slice(0, limit)
			.map((u) => ({
				_id: u._id,
				username: u.username,
				displayName: u.displayName,
				avatarUrl: u.avatarUrl,
			}));
	},
});

// Search users by username or display name
export const searchUsers = query({
	args: { query: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const limit = args.limit || 20;
		const searchQuery = args.query.toLowerCase().trim();

		if (!searchQuery) {
			return [];
		}

		// Get all users and filter by name match
		const allUsers = await ctx.db.query("users").collect();

		const matchingUsers = allUsers
			.filter((user) => {
				const username = user.username.toLowerCase();
				const displayName = (user.displayName || "").toLowerCase();
				return (
					username.includes(searchQuery) || displayName.includes(searchQuery)
				);
			})
			.sort((a, b) => {
				// Prioritize exact username matches, then prefix matches
				const aUsername = a.username.toLowerCase();
				const bUsername = b.username.toLowerCase();
				const aDisplay = (a.displayName || "").toLowerCase();
				const bDisplay = (b.displayName || "").toLowerCase();

				// Exact matches first
				if (aUsername === searchQuery) return -1;
				if (bUsername === searchQuery) return 1;

				// Prefix matches second
				if (aUsername.startsWith(searchQuery) && !bUsername.startsWith(searchQuery)) return -1;
				if (bUsername.startsWith(searchQuery) && !aUsername.startsWith(searchQuery)) return 1;

				// Display name matches
				if (aDisplay.startsWith(searchQuery) && !bDisplay.startsWith(searchQuery)) return -1;
				if (bDisplay.startsWith(searchQuery) && !aDisplay.startsWith(searchQuery)) return 1;

				return 0;
			})
			.slice(0, limit);

		// Batch fetch all related data upfront to avoid N+1 queries
		const [allReviews, allArticles, allPosts, allCollections, allQuestLogs, allFollows] =
			await Promise.all([
				ctx.db.query("reviews").collect(),
				ctx.db.query("articles").collect(),
				ctx.db.query("posts").collect(),
				ctx.db.query("collections").collect(),
				ctx.db.query("questLogs").collect(),
				ctx.db.query("follows").collect(),
			]);

		// Build count maps by userId
		const reviewCountByUser = new Map<string, number>();
		for (const review of allReviews) {
			if (review.published) {
				const authorId = review.authorId as string;
				reviewCountByUser.set(authorId, (reviewCountByUser.get(authorId) || 0) + 1);
			}
		}

		const articleCountByUser = new Map<string, number>();
		for (const article of allArticles) {
			if (article.published) {
				const authorId = article.authorId as string;
				articleCountByUser.set(authorId, (articleCountByUser.get(authorId) || 0) + 1);
			}
		}

		const postCountByUser = new Map<string, number>();
		for (const post of allPosts) {
			const authorId = post.authorId as string;
			postCountByUser.set(authorId, (postCountByUser.get(authorId) || 0) + 1);
		}

		const collectionCountByUser = new Map<string, number>();
		for (const collection of allCollections) {
			const userId = collection.userId as string;
			collectionCountByUser.set(userId, (collectionCountByUser.get(userId) || 0) + 1);
		}

		const questLogCountByUser = new Map<string, number>();
		for (const questLog of allQuestLogs) {
			if (questLog.status !== "Playing") continue;
			const userId = questLog.userId as string;
			questLogCountByUser.set(userId, (questLogCountByUser.get(userId) || 0) + 1);
		}

		const followerCountByUser = new Map<string, number>();
		for (const follow of allFollows) {
			const followingId = follow.followingId as string;
			followerCountByUser.set(followingId, (followerCountByUser.get(followingId) || 0) + 1);
		}

		// Enrich users from pre-computed maps
		const enriched = matchingUsers.map((user) => {
			const id = user._id as string;
			return {
				_id: user._id,
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
				bio: user.bio,
				_count: {
					reviews: reviewCountByUser.get(id) || 0,
					articles: articleCountByUser.get(id) || 0,
					posts: postCountByUser.get(id) || 0,
					collection: collectionCountByUser.get(id) || 0,
					questLog: questLogCountByUser.get(id) || 0,
					followers: followerCountByUser.get(id) || 0,
				},
			};
		});

		return enriched;
	},
});
