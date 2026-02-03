import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

type FeedItemType = "post" | "article" | "review";

interface FeedItem {
	type: FeedItemType;
	id: string;
	createdAt: number;
	author: {
		_id: Id<"users">;
		username: string;
		displayName: string | undefined;
		avatarUrl: string | undefined;
	};
	content: string;
	title?: string;
	excerpt?: string;
	coverImageUrl?: string;
	containsSpoilers?: boolean;
	rating?: number;
	game?: {
		_id: Id<"games">;
		name: string;
		slug: string;
		coverUrl: string | undefined;
	};
	games?: Array<{
		_id: Id<"games">;
		name: string;
		slug: string;
		coverUrl: string | undefined;
	}>;
	likeCount: number;
	commentCount: number;
	topComment?: {
		id: string;
		content: string;
		createdAt: number;
		likeCount: number;
		hasLiked: boolean;
		author: {
			_id: Id<"users">;
			username: string;
			displayName: string | undefined;
			avatarUrl: string | undefined;
		};
	};
	hasLiked: boolean;
}

async function getTopComment(
	ctx: any,
	targetType: "post" | "article" | "review",
	targetId: string,
	currentUserId: Id<"users"> | null,
) {
	const comments = await ctx.db
		.query("comments")
		.withIndex("by_target", (q: any) =>
			q.eq("targetType", targetType).eq("targetId", targetId),
		)
		.collect();

	// Filter top-level comments only
	const topLevel = comments.filter((c: Doc<"comments">) => !c.parentId);
	if (topLevel.length === 0) return undefined;

	// Find comment with most likes
	let best = topLevel[0];
	let bestLikeCount = 0;

	for (const comment of topLevel) {
		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q: any) =>
				q.eq("targetType", "comment").eq("targetId", comment._id),
			)
			.collect();
		if (
			likes.length > bestLikeCount ||
			(likes.length === bestLikeCount &&
				comment._creationTime > best._creationTime)
		) {
			best = comment;
			bestLikeCount = likes.length;
		}
	}

	const author = await ctx.db.get(best.authorId);
	const likes = await ctx.db
		.query("likes")
		.withIndex("by_target", (q: any) =>
			q.eq("targetType", "comment").eq("targetId", best._id),
		)
		.collect();

	return {
		id: best._id,
		content: best.content,
		createdAt: best._creationTime,
		likeCount: likes.length,
		hasLiked: currentUserId
			? likes.some((l: Doc<"likes">) => l.userId === currentUserId)
			: false,
		author: author
			? {
					_id: author._id,
					username: author.username,
					displayName: author.displayName,
					avatarUrl: author.avatarUrl,
				}
			: {
					_id: best.authorId,
					username: "unknown",
					displayName: undefined,
					avatarUrl: undefined,
				},
	};
}

async function enrichItems(
	ctx: any,
	posts: Doc<"posts">[],
	articles: Doc<"articles">[],
	reviews: Doc<"reviews">[],
	currentUserId: Id<"users"> | null,
): Promise<FeedItem[]> {
	const items: FeedItem[] = [];

	for (const post of posts) {
		const author = await ctx.db.get(post.authorId);
		if (!author) continue;

		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q: any) =>
				q.eq("targetType", "post").eq("targetId", post._id),
			)
			.collect();
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q: any) =>
				q.eq("targetType", "post").eq("targetId", post._id),
			)
			.collect();

		const topComment = await getTopComment(
			ctx,
			"post",
			post._id,
			currentUserId,
		);

		items.push({
			type: "post",
			id: post._id,
			createdAt: post._creationTime,
			author: {
				_id: author._id,
				username: author.username,
				displayName: author.displayName,
				avatarUrl: author.avatarUrl,
			},
			content: post.content,
			likeCount: likes.length,
			commentCount: comments.length,
			hasLiked: currentUserId
				? likes.some((l: Doc<"likes">) => l.userId === currentUserId)
				: false,
			topComment,
		});
	}

	for (const article of articles) {
		const author = await ctx.db.get(article.authorId);
		if (!author) continue;

		const gameJunctions = await ctx.db
			.query("articleGames")
			.withIndex("by_articleId", (q: any) =>
				q.eq("articleId", article._id),
			)
			.collect();
		const games = (
			await Promise.all(
				gameJunctions.map((j: Doc<"articleGames">) => ctx.db.get(j.gameId)),
			)
		).filter(Boolean);

		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q: any) =>
				q.eq("targetType", "article").eq("targetId", article._id),
			)
			.collect();
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q: any) =>
				q.eq("targetType", "article").eq("targetId", article._id),
			)
			.collect();

		const topComment = await getTopComment(
			ctx,
			"article",
			article._id,
			currentUserId,
		);

		items.push({
			type: "article",
			id: article._id,
			createdAt: article._creationTime,
			author: {
				_id: author._id,
				username: author.username,
				displayName: author.displayName,
				avatarUrl: author.avatarUrl,
			},
			content: article.content,
			title: article.title,
			excerpt: article.excerpt || undefined,
			games: games.map((g: any) => ({
				_id: g._id,
				name: g.name,
				slug: g.slug,
				coverUrl: g.coverUrl,
			})),
			likeCount: likes.length,
			commentCount: comments.length,
			hasLiked: currentUserId
				? likes.some((l: Doc<"likes">) => l.userId === currentUserId)
				: false,
			topComment,
		});
	}

	for (const review of reviews) {
		const author = await ctx.db.get(review.authorId);
		if (!author) continue;

		const game = await ctx.db.get(review.gameId);
		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q: any) =>
				q.eq("targetType", "review").eq("targetId", review._id),
			)
			.collect();
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q: any) =>
				q.eq("targetType", "review").eq("targetId", review._id),
			)
			.collect();

		const topComment = await getTopComment(
			ctx,
			"review",
			review._id,
			currentUserId,
		);

		items.push({
			type: "review",
			id: review._id,
			createdAt: review._creationTime,
			author: {
				_id: author._id,
				username: author.username,
				displayName: author.displayName,
				avatarUrl: author.avatarUrl,
			},
			content: review.content,
			title: review.title,
			coverImageUrl: review.coverImageUrl,
			containsSpoilers: review.containsSpoilers,
			rating: review.rating,
			game: game
				? {
						_id: game._id,
						name: game.name,
						slug: game.slug,
						coverUrl: game.coverUrl,
					}
				: undefined,
			likeCount: likes.length,
			commentCount: comments.length,
			hasLiked: currentUserId
				? likes.some((l: Doc<"likes">) => l.userId === currentUserId)
				: false,
			topComment,
		});
	}

	return items;
}

export const getFollowing = query({
	args: {
		clerkId: v.string(),
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) return { items: [] as FeedItem[], nextCursor: undefined };

		const follows = await ctx.db
			.query("follows")
			.withIndex("by_followerId", (q) => q.eq("followerId", user._id))
			.collect();

		if (follows.length === 0) {
			return { items: [] as FeedItem[], nextCursor: undefined };
		}

		const followingIds = new Set(follows.map((f) => f.followingId));

		// Fetch recent content from followed users
		const allPosts = await ctx.db.query("posts").order("desc").take(limit * 3);
		const posts = allPosts.filter((p) => followingIds.has(p.authorId));

		const allArticles = await ctx.db
			.query("articles")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 3);
		const articles = allArticles.filter((a) => followingIds.has(a.authorId));

		const allReviews = await ctx.db
			.query("reviews")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 3);
		const reviews = allReviews.filter((r) => followingIds.has(r.authorId));

		const items = await enrichItems(ctx, posts, articles, reviews, user._id);

		// Sort by creation time
		items.sort((a, b) => b.createdAt - a.createdAt);

		// Apply cursor
		let startIndex = 0;
		if (args.cursor) {
			const idx = items.findIndex(
				(item) => `${item.type}-${item.id}` === args.cursor,
			);
			if (idx !== -1) startIndex = idx + 1;
		}

		const paginated = items.slice(startIndex, startIndex + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = `${last.type}-${last.id}`;
		}

		return { items: paginated, nextCursor };
	},
});

export const getPopular = query({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
		clerkId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;
		const last24Hours = Date.now() - 24 * 60 * 60 * 1000;

		let currentUserId: Id<"users"> | null = null;
		if (args.clerkId) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
				.unique();
			currentUserId = user?._id ?? null;
		}

		const allPosts = await ctx.db.query("posts").order("desc").take(limit * 3);
		const posts = allPosts.filter((p) => p._creationTime >= last24Hours);

		const allArticles = await ctx.db
			.query("articles")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 3);
		const articles = allArticles.filter(
			(a) => a._creationTime >= last24Hours,
		);

		const allReviews = await ctx.db
			.query("reviews")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 3);
		const reviews = allReviews.filter((r) => r._creationTime >= last24Hours);

		const items = await enrichItems(
			ctx,
			posts,
			articles,
			reviews,
			currentUserId,
		);

		// Sort by likes desc, then creation time desc
		items.sort((a, b) => {
			if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
			return b.createdAt - a.createdAt;
		});

		let startIndex = 0;
		if (args.cursor) {
			const idx = items.findIndex(
				(item) => `${item.type}-${item.id}` === args.cursor,
			);
			if (idx !== -1) startIndex = idx + 1;
		}

		const paginated = items.slice(startIndex, startIndex + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = `${last.type}-${last.id}`;
		}

		return { items: paginated, nextCursor };
	},
});

export const getDiscover = query({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
		clerkId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;

		let currentUserId: Id<"users"> | null = null;
		if (args.clerkId) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
				.unique();
			currentUserId = user?._id ?? null;
		}

		const posts = await ctx.db
			.query("posts")
			.order("desc")
			.take(limit * 2);
		const articles = await ctx.db
			.query("articles")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 2);
		const reviews = await ctx.db
			.query("reviews")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 2);

		const items = await enrichItems(
			ctx,
			posts,
			articles,
			reviews,
			currentUserId,
		);

		items.sort((a, b) => b.createdAt - a.createdAt);

		let startIndex = 0;
		if (args.cursor) {
			const idx = items.findIndex(
				(item) => `${item.type}-${item.id}` === args.cursor,
			);
			if (idx !== -1) startIndex = idx + 1;
		}

		const paginated = items.slice(startIndex, startIndex + limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = `${last.type}-${last.id}`;
		}

		return { items: paginated, nextCursor };
	},
});
