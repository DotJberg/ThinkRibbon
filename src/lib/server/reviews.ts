// Server functions for reviews
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";

// Create a new review
export const createReview = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			title: string;
			content: string;
			rating: number;
			gameId: string;
			coverImageUrl?: string;
			coverFileKey?: string;
			containsSpoilers?: boolean;
			published?: boolean;
			authorClerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.authorClerkId },
		});
		if (!user) throw new Error("User not found");

		if (data.rating < 1 || data.rating > 5) {
			throw new Error("Rating must be between 1 and 5");
		}

		return prisma.review.create({
			data: {
				title: data.title,
				content: data.content,
				rating: data.rating,
				gameId: data.gameId,
				coverImageUrl: data.coverImageUrl,
				coverFileKey: data.coverFileKey,
				containsSpoilers: data.containsSpoilers ?? false,
				published: data.published || false,
				authorId: user.id,
			},
			include: {
				author: true,
				game: true,
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Update a review
export const updateReview = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			reviewId: string;
			title?: string;
			content?: string;
			rating?: number;
			coverImageUrl?: string;
			coverFileKey?: string;
			containsSpoilers?: boolean;
			published?: boolean;
			clerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const review = await prisma.review.findUnique({
			where: { id: data.reviewId },
			include: { author: true },
		});

		if (!review || review.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		if (data.rating && (data.rating < 1 || data.rating > 5)) {
			throw new Error("Rating must be between 1 and 5");
		}

		return prisma.review.update({
			where: { id: data.reviewId },
			data: {
				title: data.title,
				content: data.content,
				rating: data.rating,
				coverImageUrl: data.coverImageUrl,
				coverFileKey: data.coverFileKey,
				containsSpoilers: data.containsSpoilers,
				published: data.published,
			},
			include: {
				author: true,
				game: true,
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Get reviews feed
export const getReviewsFeed = createServerFn({
	method: "GET",
})
	.inputValidator((data: { cursor?: string; limit?: number }) => data)
	.handler(async ({ data }) => {
		const limit = data.limit || 10;

		const reviews = await prisma.review.findMany({
			where: { published: true },
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
				game: { select: { id: true, name: true, slug: true, coverUrl: true } },
				_count: { select: { likes: true, comments: true } },
			},
		});

		let nextCursor: string | undefined;
		if (reviews.length > limit) {
			const nextItem = reviews.pop();
			nextCursor = nextItem?.id;
		}

		return { reviews, nextCursor };
	});

// Get review by ID
export const getReviewById = createServerFn({
	method: "GET",
})
	.inputValidator((reviewId: string) => reviewId)
	.handler(async ({ data: reviewId }) => {
		return prisma.review.findUnique({
			where: { id: reviewId },
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
				game: true,
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Get reviews by game
export const getReviewsByGame = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { gameId: string; cursor?: string; limit?: number }) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 10;

		const reviews = await prisma.review.findMany({
			where: { gameId: data.gameId, published: true },
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
		if (reviews.length > limit) {
			const nextItem = reviews.pop();
			nextCursor = nextItem?.id;
		}

		return { reviews, nextCursor };
	});

// Get reviews by user
export const getReviewsByUser = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: {
			username: string;
			includeUnpublished?: boolean;
			clerkId?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		// Get the current user's ID for like status check
		const currentUser = data.clerkId
			? await prisma.user.findUnique({ where: { clerkId: data.clerkId } })
			: null;
		const userId = currentUser?.id ?? "___dummy___";

		return prisma.review.findMany({
			where: {
				author: { username: data.username },
				...(data.includeUnpublished ? {} : { published: true }),
			},
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
				game: { select: { id: true, name: true, slug: true, coverUrl: true } },
				_count: { select: { likes: true, comments: true } },
				likes: { where: { userId }, select: { id: true } },
			},
		});
	});

// Get average rating for a game
export const getGameAverageRating = createServerFn({
	method: "GET",
})
	.inputValidator((gameId: string) => gameId)
	.handler(async ({ data: gameId }) => {
		const result = await prisma.review.aggregate({
			where: { gameId, published: true },
			_avg: { rating: true },
			_count: true,
		});
		return {
			averageRating: result._avg.rating || 0,
			reviewCount: result._count,
		};
	});

// Delete a review
export const deleteReview = createServerFn({
	method: "POST",
})
	.inputValidator((data: { reviewId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const review = await prisma.review.findUnique({
			where: { id: data.reviewId },
			include: { author: true },
		});

		if (!review || review.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		await prisma.review.delete({ where: { id: data.reviewId } });
		return { success: true };
	});

// Toggle like on a review
export const toggleReviewLike = createServerFn({
	method: "POST",
})
	.inputValidator((data: { reviewId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const existingLike = await prisma.like.findUnique({
			where: { userId_reviewId: { userId: user.id, reviewId: data.reviewId } },
		});

		if (existingLike) {
			await prisma.like.delete({ where: { id: existingLike.id } });
			return { liked: false };
		}

		await prisma.like.create({
			data: { userId: user.id, reviewId: data.reviewId },
		});
		return { liked: true };
	});
