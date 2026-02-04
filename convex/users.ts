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
