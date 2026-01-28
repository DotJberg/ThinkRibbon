// Server functions for articles
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";

// Create a new article
export const createArticle = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			title: string;
			content: string;
			excerpt?: string;
			coverImageUrl?: string;
			coverFileKey?: string;
			containsSpoilers?: boolean;
			gameIds?: string[];
			published?: boolean;
			authorClerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.authorClerkId },
		});
		if (!user) throw new Error("User not found");

		const article = await prisma.article.create({
			data: {
				title: data.title,
				content: data.content,
				excerpt: data.excerpt,
				coverImageUrl: data.coverImageUrl,
				coverFileKey: data.coverFileKey,
				containsSpoilers: data.containsSpoilers ?? false,
				published: data.published || false,
				authorId: user.id,
				games: data.gameIds
					? {
							create: data.gameIds.map((gameId: string) => ({ gameId })),
						}
					: undefined,
			},
			include: {
				author: true,
				games: { include: { game: true } },
				_count: { select: { likes: true, comments: true } },
			},
		});
		return article;
	});

// Update an article
export const updateArticle = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			articleId: string;
			title?: string;
			content?: string;
			excerpt?: string;
			coverImageUrl?: string;
			coverFileKey?: string;
			containsSpoilers?: boolean;
			gameIds?: string[];
			published?: boolean;
			clerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const article = await prisma.article.findUnique({
			where: { id: data.articleId },
			include: { author: true },
		});

		if (!article || article.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		// If gameIds provided, update the relation
		if (data.gameIds) {
			await prisma.articleGame.deleteMany({
				where: { articleId: data.articleId },
			});
			await prisma.articleGame.createMany({
				data: data.gameIds.map((gameId: string) => ({
					articleId: data.articleId,
					gameId,
				})),
			});
		}

		return prisma.article.update({
			where: { id: data.articleId },
			data: {
				title: data.title,
				content: data.content,
				excerpt: data.excerpt,
				coverImageUrl: data.coverImageUrl,
				coverFileKey: data.coverFileKey,
				containsSpoilers: data.containsSpoilers,
				published: data.published,
			},
			include: {
				author: true,
				games: { include: { game: true } },
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Get articles feed
export const getArticlesFeed = createServerFn({
	method: "GET",
})
	.inputValidator((data: { cursor?: string; limit?: number }) => data)
	.handler(async ({ data }) => {
		const limit = data.limit || 10;

		const articles = await prisma.article.findMany({
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
				games: {
					include: {
						game: {
							select: { id: true, name: true, slug: true, coverUrl: true },
						},
					},
				},
				_count: { select: { likes: true, comments: true } },
			},
		});

		let nextCursor: string | undefined;
		if (articles.length > limit) {
			const nextItem = articles.pop();
			nextCursor = nextItem?.id;
		}

		return { articles, nextCursor };
	});

// Get article by ID
export const getArticleById = createServerFn({
	method: "GET",
})
	.inputValidator((articleId: string) => articleId)
	.handler(async ({ data: articleId }) => {
		return prisma.article.findUnique({
			where: { id: articleId },
			include: {
				author: {
					select: {
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
				games: { include: { game: true } },
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Get articles by user
export const getArticlesByUser = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { username: string; includeUnpublished?: boolean }) => data,
	)
	.handler(async ({ data }) => {
		return prisma.article.findMany({
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
				games: {
					include: {
						game: {
							select: { id: true, name: true, slug: true, coverUrl: true },
						},
					},
				},
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Get articles by game
export const getArticlesByGame = createServerFn({
	method: "GET",
})
	.inputValidator((gameId: string) => gameId)
	.handler(async ({ data: gameId }) => {
		return prisma.article.findMany({
			where: {
				published: true,
				games: { some: { gameId } },
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
				_count: { select: { likes: true, comments: true } },
			},
		});
	});

// Delete an article
export const deleteArticle = createServerFn({
	method: "POST",
})
	.inputValidator((data: { articleId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const article = await prisma.article.findUnique({
			where: { id: data.articleId },
			include: { author: true },
		});

		if (!article || article.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		await prisma.article.delete({ where: { id: data.articleId } });
		return { success: true };
	});

// Toggle like on an article
export const toggleArticleLike = createServerFn({
	method: "POST",
})
	.inputValidator((data: { articleId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const existingLike = await prisma.like.findUnique({
			where: {
				userId_articleId: { userId: user.id, articleId: data.articleId },
			},
		});

		if (existingLike) {
			await prisma.like.delete({ where: { id: existingLike.id } });
			return { liked: false };
		}

		await prisma.like.create({
			data: { userId: user.id, articleId: data.articleId },
		});
		return { liked: true };
	});
