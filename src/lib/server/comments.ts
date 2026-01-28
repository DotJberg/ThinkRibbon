// Server functions for comments
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";

// Create a comment
export const createComment = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			content: string;
			authorClerkId: string;
			postId?: string;
			articleId?: string;
			reviewId?: string;
			parentId?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.authorClerkId },
		});
		if (!user) throw new Error("User not found");

		return prisma.comment.create({
			data: {
				content: data.content.slice(0, 1000),
				authorId: user.id,
				postId: data.postId,
				articleId: data.articleId,
				reviewId: data.reviewId,
				parentId: data.parentId,
			},
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
			},
		});
	});

// Get comments for a post
export const getPostComments = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: {
			postId: string;
			cursor?: string;
			limit?: number;
			clerkId?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;
		const user = data.clerkId
			? await prisma.user.findUnique({ where: { clerkId: data.clerkId } })
			: null;
		const userId = user?.id ?? "___dummy___";

		const comments = await prisma.comment.findMany({
			where: { postId: data.postId, parentId: null },
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { likes: { _count: "desc" } }, // Sort by popularity as requested for feed preview? Or date? User said "most popular one should be shown". Usually comments are sorted by popularity or date.
			// Let's default to Date DESC or ASC? "popular one" usually implies sorting.
			// But for conversation, ASC is natural.
			// I'll stick to 'desc' for likes, then 'desc' for date?
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
				_count: { select: { likes: true, replies: true } },
				likes: { where: { userId }, select: { id: true } },
				replies: {
					orderBy: { createdAt: "asc" },
					include: {
						author: {
							select: {
								id: true,
								username: true,
								displayName: true,
								avatarUrl: true,
							},
						},
						_count: { select: { likes: true } },
						likes: { where: { userId }, select: { id: true } },
					},
				},
			},
		});

		let nextCursor: string | undefined;
		if (comments.length > limit) {
			const nextItem = comments.pop();
			nextCursor = nextItem?.id;
		}

		return { comments, nextCursor };
	});

// Get comments for an article
export const getArticleComments = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { articleId: string; cursor?: string; limit?: number }) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		const comments = await prisma.comment.findMany({
			where: { articleId: data.articleId },
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { createdAt: "asc" },
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
			},
		});

		let nextCursor: string | undefined;
		if (comments.length > limit) {
			const nextItem = comments.pop();
			nextCursor = nextItem?.id;
		}

		return { comments, nextCursor };
	});

// Get comments for a review
export const getReviewComments = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { reviewId: string; cursor?: string; limit?: number }) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		const comments = await prisma.comment.findMany({
			where: { reviewId: data.reviewId },
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { createdAt: "asc" },
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
			},
		});

		let nextCursor: string | undefined;
		if (comments.length > limit) {
			const nextItem = comments.pop();
			nextCursor = nextItem?.id;
		}

		return { comments, nextCursor };
	});

// Delete a comment
export const deleteComment = createServerFn({
	method: "POST",
})
	.inputValidator((data: { commentId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const comment = await prisma.comment.findUnique({
			where: { id: data.commentId },
			include: { author: true },
		});

		if (!comment || comment.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		await prisma.comment.delete({ where: { id: data.commentId } });
		return { success: true };
	});
