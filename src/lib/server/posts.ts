// Server functions for posts
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";

// Create a new post
export const createPost = createServerFn({
	method: "POST",
})
	.inputValidator((data: { content: string; authorClerkId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.authorClerkId },
		});
		if (!user) throw new Error("User not found");

		return prisma.post.create({
			data: {
				content: data.content.slice(0, 280),
				authorId: user.id,
			},
			include: {
				author: true,
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Get posts feed with pagination
export const getPostsFeed = createServerFn({
	method: "GET",
})
	.inputValidator((data: { cursor?: string; limit?: number }) => data)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		const posts = await prisma.post.findMany({
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
				_count: { select: { likes: true, comments: true } },
			},
		});

		let nextCursor: string | undefined;
		if (posts.length > limit) {
			const nextItem = posts.pop();
			nextCursor = nextItem?.id;
		}

		return { posts, nextCursor };
	});

// Get posts by user
export const getPostsByUser = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { username: string; cursor?: string; limit?: number }) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		const posts = await prisma.post.findMany({
			where: { author: { username: data.username } },
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
				_count: { select: { likes: true, comments: true } },
			},
		});

		let nextCursor: string | undefined;
		if (posts.length > limit) {
			const nextItem = posts.pop();
			nextCursor = nextItem?.id;
		}

		return { posts, nextCursor };
	});

// Delete a post
export const deletePost = createServerFn({
	method: "POST",
})
	.inputValidator((data: { postId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const post = await prisma.post.findUnique({
			where: { id: data.postId },
			include: { author: true },
		});

		if (!post || post.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		await prisma.post.delete({ where: { id: data.postId } });
		return { success: true };
	});

// Toggle like on a post
export const togglePostLike = createServerFn({
	method: "POST",
})
	.inputValidator((data: { postId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const existingLike = await prisma.like.findUnique({
			where: { userId_postId: { userId: user.id, postId: data.postId } },
		});

		if (existingLike) {
			await prisma.like.delete({ where: { id: existingLike.id } });
			return { liked: false };
		}

		await prisma.like.create({
			data: { userId: user.id, postId: data.postId },
		});
		return { liked: true };
	});

// Check if user has liked a post
export const hasLikedPost = createServerFn({
	method: "GET",
})
	.inputValidator((data: { postId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) return false;

		const like = await prisma.like.findUnique({
			where: { userId_postId: { userId: user.id, postId: data.postId } },
		});
		return !!like;
	});

// Get a single post by ID
export const getPostById = createServerFn({
	method: "GET",
})
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const post = await prisma.post.findUnique({
			where: { id: data.id },
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
						clerkId: true,
					},
				},
				_count: { select: { likes: true, comments: true } },
			},
		});
		return post;
	});
