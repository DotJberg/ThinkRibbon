// Server functions for unified timeline feeds
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";

// Type for unified feed items
export type FeedItemType = "post" | "article" | "review";

export interface TopComment {
	id: string;
	content: string;
	createdAt: Date;
	likeCount: number;
	hasLiked?: boolean;
	author: {
		id: string;
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
	};
}

export interface FeedItem {
	type: FeedItemType;
	id: string;
	createdAt: Date;
	author: {
		id: string;
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
	};
	content: string;
	title?: string;
	excerpt?: string;
	coverImageUrl?: string | null;
	containsSpoilers?: boolean;
	rating?: number;
	game?: {
		id: string;
		name: string;
		slug: string;
		coverUrl: string | null;
	};
	games?: Array<{
		id: string;
		name: string;
		slug: string;
		coverUrl: string | null;
	}>;
	likeCount: number;
	commentCount: number;
	topComment?: TopComment;
	hasLiked?: boolean;
}

// Get following feed - content from users you follow (chronological)
export const getFollowingFeed = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { clerkId: string; cursor?: string; limit?: number }) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		// Get the current user
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
			include: {
				following: { select: { followingId: true } },
			},
		});

		if (!user) {
			return { items: [] as FeedItem[], nextCursor: undefined };
		}

		const followingIds = user.following.map((f) => f.followingId);

		if (followingIds.length === 0) {
			return { items: [] as FeedItem[], nextCursor: undefined };
		}

		// Fetch posts, articles, and reviews from followed users with top comment
		const [posts, articles, reviews] = await Promise.all([
			prisma.post.findMany({
				where: { authorId: { in: followingIds } },
				orderBy: { createdAt: "desc" },
				take: limit * 2,
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
					likes: { where: { userId: user.id }, select: { id: true } },
					comments: {
						take: 1,
						orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
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
							likes: { where: { userId: user.id }, select: { id: true } },
						},
					},
				},
			}),
			prisma.article.findMany({
				where: { authorId: { in: followingIds }, published: true },
				orderBy: { createdAt: "desc" },
				take: limit * 2,
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
					likes: { where: { userId: user.id }, select: { id: true } },
					comments: {
						take: 1,
						orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
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
							likes: { where: { userId: user.id }, select: { id: true } },
						},
					},
				},
			}),
			prisma.review.findMany({
				where: { authorId: { in: followingIds }, published: true },
				orderBy: { createdAt: "desc" },
				take: limit * 2,
				include: {
					author: {
						select: {
							id: true,
							username: true,
							displayName: true,
							avatarUrl: true,
						},
					},
					game: {
						select: { id: true, name: true, slug: true, coverUrl: true },
					},
					_count: { select: { likes: true, comments: true } },
					likes: { where: { userId: user.id }, select: { id: true } },
					comments: {
						take: 1,
						orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
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
							likes: { where: { userId: user.id }, select: { id: true } },
						},
					},
				},
			}),
		]);

		// Transform to unified FeedItem format
		const items: FeedItem[] = [
			...posts.map((p) => ({
				type: "post" as FeedItemType,
				id: p.id,
				createdAt: p.createdAt,
				author: p.author,
				content: p.content,
				likeCount: p._count.likes,
				hasLiked: p.likes.length > 0,
				commentCount: p._count.comments,
				topComment: p.comments[0]
					? {
							id: p.comments[0].id,
							content: p.comments[0].content,
							createdAt: p.comments[0].createdAt,
							likeCount: p.comments[0]._count.likes,
							hasLiked: p.comments[0].likes.length > 0,
							author: p.comments[0].author,
						}
					: undefined,
			})),
			...articles.map((a) => ({
				type: "article" as FeedItemType,
				id: a.id,
				createdAt: a.createdAt,
				author: a.author,
				content: a.content,
				title: a.title,
				excerpt: a.excerpt || undefined,
				games: a.games.map((g) => g.game),
				likeCount: a._count.likes,
				hasLiked: a.likes.length > 0,
				commentCount: a._count.comments,
				topComment: a.comments[0]
					? {
							id: a.comments[0].id,
							content: a.comments[0].content,
							createdAt: a.comments[0].createdAt,
							likeCount: a.comments[0]._count.likes,
							hasLiked: a.comments[0].likes.length > 0,
							author: a.comments[0].author,
						}
					: undefined,
			})),
			...reviews.map((r) => ({
				type: "review" as FeedItemType,
				id: r.id,
				createdAt: r.createdAt,
				author: r.author,
				content: r.content,
				title: r.title,
				coverImageUrl: r.coverImageUrl,
				containsSpoilers: r.containsSpoilers,
				rating: r.rating,
				game: r.game,
				likeCount: r._count.likes,
				hasLiked: r.likes.length > 0,
				commentCount: r._count.comments,
				topComment: r.comments[0]
					? {
							id: r.comments[0].id,
							content: r.comments[0].content,
							createdAt: r.comments[0].createdAt,
							likeCount: r.comments[0]._count.likes,
							hasLiked: r.comments[0].likes.length > 0,
							author: r.comments[0].author,
						}
					: undefined,
			})),
		];

		// Sort by createdAt descending
		items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

		// Apply cursor-based pagination
		let startIndex = 0;
		if (data.cursor) {
			const cursorIndex = items.findIndex(
				(item) => `${item.type}-${item.id}` === data.cursor,
			);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const paginatedItems = items.slice(startIndex, startIndex + limit + 1);
		let nextCursor: string | undefined;
		if (paginatedItems.length > limit) {
			const lastItem = paginatedItems.pop();
			if (lastItem) {
				nextCursor = `${lastItem.type}-${lastItem.id}`;
			}
		}

		return { items: paginatedItems, nextCursor };
	});

// Get popular feed - top content from last 24 hours by likes
export const getPopularFeed = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { cursor?: string; limit?: number; clerkId?: string }) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;
		const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const user = data.clerkId
			? await prisma.user.findUnique({ where: { clerkId: data.clerkId } })
			: null;
		const userId = user?.id ?? "___dummy___";

		// Fetch all content from last 24 hours with like counts and top comment
		const [posts, articles, reviews] = await Promise.all([
			prisma.post.findMany({
				where: { createdAt: { gte: last24Hours } },
				orderBy: { likes: { _count: "desc" } },
				take: limit * 2,
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
					likes: { where: { userId }, select: { id: true } },
					comments: {
						take: 1,
						orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
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
			}),
			prisma.article.findMany({
				where: { createdAt: { gte: last24Hours }, published: true },
				orderBy: { likes: { _count: "desc" } },
				take: limit * 2,
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
					likes: { where: { userId }, select: { id: true } },
					comments: {
						take: 1,
						orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
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
			}),
			prisma.review.findMany({
				where: { createdAt: { gte: last24Hours }, published: true },
				orderBy: { likes: { _count: "desc" } },
				take: limit * 2,
				include: {
					author: {
						select: {
							id: true,
							username: true,
							displayName: true,
							avatarUrl: true,
						},
					},
					game: {
						select: { id: true, name: true, slug: true, coverUrl: true },
					},
					_count: { select: { likes: true, comments: true } },
					likes: { where: { userId }, select: { id: true } },
					comments: {
						take: 1,
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
							_count: { select: { likes: true } },
							likes: { where: { userId }, select: { id: true } },
						},
					},
				},
			}),
		]);

		// Transform to unified FeedItem format
		const items: FeedItem[] = [
			...posts.map((p) => ({
				type: "post" as FeedItemType,
				id: p.id,
				createdAt: p.createdAt,
				author: p.author,
				content: p.content,
				likeCount: p._count.likes,
				hasLiked: p.likes.length > 0,
				commentCount: p._count.comments,
				topComment: p.comments[0]
					? {
							id: p.comments[0].id,
							content: p.comments[0].content,
							createdAt: p.comments[0].createdAt,
							likeCount: p.comments[0]._count.likes,
							hasLiked: p.comments[0].likes.length > 0,
							author: p.comments[0].author,
						}
					: undefined,
			})),
			...articles.map((a) => ({
				type: "article" as FeedItemType,
				id: a.id,
				createdAt: a.createdAt,
				author: a.author,
				content: a.content,
				title: a.title,
				excerpt: a.excerpt || undefined,
				games: a.games.map((g) => g.game),
				likeCount: a._count.likes,
				hasLiked: a.likes.length > 0,
				commentCount: a._count.comments,
				topComment: a.comments[0]
					? {
							id: a.comments[0].id,
							content: a.comments[0].content,
							createdAt: a.comments[0].createdAt,
							likeCount: a.comments[0]._count.likes,
							hasLiked: a.comments[0].likes.length > 0,
							author: a.comments[0].author,
						}
					: undefined,
			})),
			...reviews.map((r) => ({
				type: "review" as FeedItemType,
				id: r.id,
				createdAt: r.createdAt,
				author: r.author,
				content: r.content,
				title: r.title,
				coverImageUrl: r.coverImageUrl,
				containsSpoilers: r.containsSpoilers,
				rating: r.rating,
				game: r.game,
				likeCount: r._count.likes,
				hasLiked: r.likes.length > 0,
				commentCount: r._count.comments,
				topComment: r.comments[0]
					? {
							id: r.comments[0].id,
							content: r.comments[0].content,
							createdAt: r.comments[0].createdAt,
							likeCount: r.comments[0]._count.likes,
							hasLiked: r.comments[0].likes.length > 0,
							author: r.comments[0].author,
						}
					: undefined,
			})),
		];

		// Sort by like count descending, then by createdAt descending as tiebreaker
		items.sort((a, b) => {
			if (b.likeCount !== a.likeCount) {
				return b.likeCount - a.likeCount;
			}
			return b.createdAt.getTime() - a.createdAt.getTime();
		});

		// Apply cursor-based pagination
		let startIndex = 0;
		if (data.cursor) {
			const cursorIndex = items.findIndex(
				(item) => `${item.type}-${item.id}` === data.cursor,
			);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const paginatedItems = items.slice(startIndex, startIndex + limit + 1);
		let nextCursor: string | undefined;
		if (paginatedItems.length > limit) {
			const lastItem = paginatedItems.pop();
			if (lastItem) {
				nextCursor = `${lastItem.type}-${lastItem.id}`;
			}
		}

		return { items: paginatedItems, nextCursor };
	});
