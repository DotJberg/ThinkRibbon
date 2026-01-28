// Server functions for user management
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";

// Sync user from Clerk to database
export const syncUser = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			clerkId: string;
			email: string;
			username: string;
			displayName?: string;
			avatarUrl?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		// First, check if user exists by clerkId
		const existingByClerkId = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
			select: { id: true, avatarUrl: true },
		});

		// If user exists by clerkId, just update them
		if (existingByClerkId) {
			const shouldUpdateAvatar =
				!existingByClerkId.avatarUrl ||
				existingByClerkId.avatarUrl.includes("clerk.com") ||
				existingByClerkId.avatarUrl.includes("clerk.dev");

			return prisma.user.update({
				where: { clerkId: data.clerkId },
				data: {
					email: data.email,
					displayName: data.displayName,
					...(shouldUpdateAvatar && data.avatarUrl
						? { avatarUrl: data.avatarUrl }
						: {}),
				},
			});
		}

		// Check if user exists by email (could happen if Clerk account was recreated)
		const existingByEmail = await prisma.user.findUnique({
			where: { email: data.email },
			select: { id: true, avatarUrl: true },
		});

		if (existingByEmail) {
			// Update existing user with new clerkId
			const shouldUpdateAvatar =
				!existingByEmail.avatarUrl ||
				existingByEmail.avatarUrl.includes("clerk.com") ||
				existingByEmail.avatarUrl.includes("clerk.dev");

			return prisma.user.update({
				where: { email: data.email },
				data: {
					clerkId: data.clerkId,
					displayName: data.displayName,
					...(shouldUpdateAvatar && data.avatarUrl
						? { avatarUrl: data.avatarUrl }
						: {}),
				},
			});
		}

		// No existing user, create new one
		return prisma.user.create({
			data: {
				clerkId: data.clerkId,
				email: data.email,
				username: data.username,
				displayName: data.displayName,
				avatarUrl: data.avatarUrl,
			},
		});
	});

// Get user by Clerk ID
export const getUserByClerkId = createServerFn({
	method: "GET",
})
	.inputValidator((clerkId: string) => clerkId)
	.handler(async ({ data: clerkId }) => {
		return prisma.user.findUnique({
			where: { clerkId },
		});
	});

// Get user by username
export const getUserByUsername = createServerFn({
	method: "GET",
})
	.inputValidator((username: string) => username)
	.handler(async ({ data: username }) => {
		return prisma.user.findUnique({
			where: { username },
			include: {
				_count: {
					select: {
						posts: true,
						articles: { where: { published: true } },
						reviews: { where: { published: true } },
					},
				},
			},
		});
	});

// Update user profile
export const updateUserProfile = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			clerkId: string;
			displayName?: string;
			bio?: string;
			avatarUrl?: string;
			bannerUrl?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		return prisma.user.update({
			where: { clerkId: data.clerkId },
			data: {
				displayName: data.displayName,
				bio: data.bio,
				avatarUrl: data.avatarUrl,
				bannerUrl: data.bannerUrl,
			},
		});
	});

// Check if username is available
export const checkUsernameAvailable = createServerFn({
	method: "GET",
})
	.inputValidator((username: string) => username)
	.handler(async ({ data: username }) => {
		const existing = await prisma.user.findUnique({
			where: { username },
			select: { id: true },
		});
		return !existing;
	});

// Follow a user
export const followUser = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; targetUserId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");
		if (user.id === data.targetUserId)
			throw new Error("Cannot follow yourself");

		await prisma.follow.create({
			data: {
				followerId: user.id,
				followingId: data.targetUserId,
			},
		});
		return { success: true };
	});

// Unfollow a user
export const unfollowUser = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; targetUserId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		await prisma.follow.deleteMany({
			where: {
				followerId: user.id,
				followingId: data.targetUserId,
			},
		});
		return { success: true };
	});

// Check if following a user
export const isFollowing = createServerFn({
	method: "GET",
})
	.inputValidator((data: { clerkId: string; targetUserId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) return false;

		const follow = await prisma.follow.findUnique({
			where: {
				followerId_followingId: {
					followerId: user.id,
					followingId: data.targetUserId,
				},
			},
		});
		return !!follow;
	});

// Get follow counts for a user
export const getFollowCounts = createServerFn({
	method: "GET",
})
	.inputValidator((userId: string) => userId)
	.handler(async ({ data: userId }) => {
		const [followers, following] = await Promise.all([
			prisma.follow.count({ where: { followingId: userId } }),
			prisma.follow.count({ where: { followerId: userId } }),
		]);
		return { followers, following };
	});
