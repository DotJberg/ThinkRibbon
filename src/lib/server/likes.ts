// Server functions for likes
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";

// Toggle like on a post
export const togglePostLike = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; postId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		// Check if already liked - use findFirst for nullable compound unique
		const existingLike = await prisma.like.findFirst({
			where: {
				userId: user.id,
				postId: data.postId,
			},
		});

		if (existingLike) {
			// Unlike
			await prisma.like.delete({ where: { id: existingLike.id } });
			return { liked: false };
		} else {
			// Like
			await prisma.like.create({
				data: { userId: user.id, postId: data.postId },
			});
			return { liked: true };
		}
	});

// Toggle like on an article
export const toggleArticleLike = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; articleId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const existingLike = await prisma.like.findFirst({
			where: {
				userId: user.id,
				articleId: data.articleId,
			},
		});

		if (existingLike) {
			await prisma.like.delete({ where: { id: existingLike.id } });
			return { liked: false };
		} else {
			await prisma.like.create({
				data: { userId: user.id, articleId: data.articleId },
			});
			return { liked: true };
		}
	});

// Toggle like on a review
export const toggleReviewLike = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; reviewId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const existingLike = await prisma.like.findFirst({
			where: {
				userId: user.id,
				reviewId: data.reviewId,
			},
		});

		if (existingLike) {
			await prisma.like.delete({ where: { id: existingLike.id } });
			return { liked: false };
		} else {
			await prisma.like.create({
				data: { userId: user.id, reviewId: data.reviewId },
			});
			return { liked: true };
		}
	});

// Toggle like on a comment
export const toggleCommentLike = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; commentId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const existingLike = await prisma.like.findFirst({
			where: {
				userId: user.id,
				commentId: data.commentId,
			},
		});

		if (existingLike) {
			await prisma.like.delete({ where: { id: existingLike.id } });
			return { liked: false };
		} else {
			await prisma.like.create({
				data: { userId: user.id, commentId: data.commentId },
			});
			return { liked: true };
		}
	});

// Check if user has liked content
export const hasLikedContent = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: {
			clerkId: string;
			postId?: string;
			articleId?: string;
			reviewId?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) return false;

		let like = null;
		if (data.postId) {
			like = await prisma.like.findFirst({
				where: { userId: user.id, postId: data.postId },
			});
		} else if (data.articleId) {
			like = await prisma.like.findFirst({
				where: { userId: user.id, articleId: data.articleId },
			});
		} else if (data.reviewId) {
			like = await prisma.like.findFirst({
				where: { userId: user.id, reviewId: data.reviewId },
			});
		}

		return !!like;
	});
