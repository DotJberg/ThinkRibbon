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
				displayName: args.displayName,
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
				displayName: args.displayName,
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
			displayName: args.displayName,
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

		// Enrich with stats
		const enriched = await Promise.all(
			users.map(async (user) => {
				// Count reviews
				const reviews = await ctx.db
					.query("reviews")
					.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
					.collect();
				const publishedReviews = reviews.filter((r) => r.published);

				// Count articles
				const articles = await ctx.db
					.query("articles")
					.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
					.collect();
				const publishedArticles = articles.filter((a) => a.published);

				// Count posts
				const posts = await ctx.db
					.query("posts")
					.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
					.collect();

				// Count collection items
				const collectionItems = await ctx.db
					.query("collections")
					.withIndex("by_userId", (q) => q.eq("userId", user._id))
					.collect();

				// Count quest log entries
				const questLogEntries = await ctx.db
					.query("questLogs")
					.withIndex("by_userId", (q) => q.eq("userId", user._id))
					.collect();

				// Get follower count
				const followers = await ctx.db
					.query("follows")
					.withIndex("by_followingId", (q) => q.eq("followingId", user._id))
					.collect();

				return {
					_id: user._id,
					username: user.username,
					displayName: user.displayName,
					avatarUrl: user.avatarUrl,
					bio: user.bio,
					_count: {
						reviews: publishedReviews.length,
						articles: publishedArticles.length,
						posts: posts.length,
						collection: collectionItems.length,
						questLog: questLogEntries.length,
						followers: followers.length,
					},
				};
			}),
		);

		return enriched;
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

		// Enrich with stats
		const enriched = await Promise.all(
			matchingUsers.map(async (user) => {
				const reviews = await ctx.db
					.query("reviews")
					.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
					.collect();
				const publishedReviews = reviews.filter((r) => r.published);

				const articles = await ctx.db
					.query("articles")
					.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
					.collect();
				const publishedArticles = articles.filter((a) => a.published);

				const posts = await ctx.db
					.query("posts")
					.withIndex("by_authorId", (q) => q.eq("authorId", user._id))
					.collect();

				const collectionItems = await ctx.db
					.query("collections")
					.withIndex("by_userId", (q) => q.eq("userId", user._id))
					.collect();

				const questLogEntries = await ctx.db
					.query("questLogs")
					.withIndex("by_userId", (q) => q.eq("userId", user._id))
					.collect();

				const followers = await ctx.db
					.query("follows")
					.withIndex("by_followingId", (q) => q.eq("followingId", user._id))
					.collect();

				return {
					_id: user._id,
					username: user.username,
					displayName: user.displayName,
					avatarUrl: user.avatarUrl,
					bio: user.bio,
					_count: {
						reviews: publishedReviews.length,
						articles: publishedArticles.length,
						posts: posts.length,
						collection: collectionItems.length,
						questLog: questLogEntries.length,
						followers: followers.length,
					},
				};
			}),
		);

		return enriched;
	},
});
