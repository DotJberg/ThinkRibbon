import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

type FeedItemType = "post" | "article" | "review";

interface FeedItem {
	type: FeedItemType;
	id: string;
	createdAt: number;
	updatedAt?: number;
	editCount?: number;
	author: {
		_id: Id<"users">;
		clerkId: string;
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
	tags?: string[];
	genres?: string[];
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
	images?: Array<{
		url: string;
		caption: string | undefined;
	}>;
	linkPreview?: {
		url: string;
		title: string | undefined;
		description: string | undefined;
		imageUrl: string | undefined;
		siteName: string | undefined;
		domain: string;
	};
	mentions?: Array<{
		type: "user" | "game";
		id: string;
		slug: string;
		displayText: string;
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

// Helper to get top comment from pre-fetched data
function getTopCommentFromMaps(
	targetType: "post" | "article" | "review",
	targetId: string,
	currentUserId: Id<"users"> | null,
	commentsByTarget: Map<string, Doc<"comments">[]>,
	likesByTarget: Map<string, Doc<"likes">[]>,
	usersById: Map<string, Doc<"users">>,
) {
	const key = `${targetType}-${targetId}`;
	const comments = commentsByTarget.get(key) || [];

	// Filter top-level comments only
	const topLevel = comments.filter((c) => !c.parentId);
	if (topLevel.length === 0) return undefined;

	// Find comment with most likes
	let best = topLevel[0];
	let bestLikeCount = 0;

	for (const comment of topLevel) {
		const commentLikes = likesByTarget.get(`comment-${comment._id}`) || [];
		if (
			commentLikes.length > bestLikeCount ||
			(commentLikes.length === bestLikeCount &&
				comment._creationTime > best._creationTime)
		) {
			best = comment;
			bestLikeCount = commentLikes.length;
		}
	}

	const author = usersById.get(best.authorId as string);
	const bestLikes = likesByTarget.get(`comment-${best._id}`) || [];

	return {
		id: best._id,
		content: best.content,
		createdAt: best._creationTime,
		likeCount: bestLikes.length,
		hasLiked: currentUserId
			? bestLikes.some((l) => l.userId === currentUserId)
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

	// Batch fetch all related data upfront
	const [
		allLikes,
		allComments,
		allPostImages,
		allPostLinkPreviews,
		allArticleGames,
		allGames,
	] = await Promise.all([
		ctx.db.query("likes").collect(),
		ctx.db.query("comments").collect(),
		ctx.db.query("postImages").collect(),
		ctx.db.query("postLinkPreviews").collect(),
		ctx.db.query("articleGames").collect(),
		ctx.db.query("games").collect(),
	]);

	// Fetch all users (authors + comment authors)
	const allUsers = await ctx.db.query("users").collect();

	// Build lookup maps
	const usersById = new Map<string, Doc<"users">>();
	for (const user of allUsers) {
		usersById.set(user._id as string, user);
	}

	const gamesById = new Map<string, Doc<"games">>();
	for (const game of allGames) {
		gamesById.set(game._id as string, game);
	}

	// Build likes by target (type-id)
	const likesByTarget = new Map<string, Doc<"likes">[]>();
	for (const like of allLikes) {
		const key = `${like.targetType}-${like.targetId}`;
		if (!likesByTarget.has(key)) likesByTarget.set(key, []);
		likesByTarget.get(key)!.push(like);
	}

	// Build comments by target (type-id)
	const commentsByTarget = new Map<string, Doc<"comments">[]>();
	for (const comment of allComments) {
		const key = `${comment.targetType}-${comment.targetId}`;
		if (!commentsByTarget.has(key)) commentsByTarget.set(key, []);
		commentsByTarget.get(key)!.push(comment);
	}

	// Build post images by postId
	const postImagesByPostId = new Map<string, Doc<"postImages">[]>();
	for (const img of allPostImages) {
		const key = img.postId as string;
		if (!postImagesByPostId.has(key)) postImagesByPostId.set(key, []);
		postImagesByPostId.get(key)!.push(img);
	}

	// Build link previews by postId
	const linkPreviewsByPostId = new Map<string, Doc<"postLinkPreviews">>();
	for (const preview of allPostLinkPreviews) {
		linkPreviewsByPostId.set(preview.postId as string, preview);
	}

	// Build article games by articleId
	const articleGamesByArticleId = new Map<string, Doc<"articleGames">[]>();
	for (const ag of allArticleGames) {
		const key = ag.articleId as string;
		if (!articleGamesByArticleId.has(key)) articleGamesByArticleId.set(key, []);
		articleGamesByArticleId.get(key)!.push(ag);
	}

	const items: FeedItem[] = [];

	// Process posts
	for (const post of posts) {
		const author = usersById.get(post.authorId as string);
		if (!author) continue;

		const postLikes = likesByTarget.get(`post-${post._id}`) || [];
		const postComments = commentsByTarget.get(`post-${post._id}`) || [];
		const postImages = postImagesByPostId.get(post._id as string) || [];

		// Fetch link preview only if no images
		let linkPreview = undefined;
		if (postImages.length === 0) {
			const preview = linkPreviewsByPostId.get(post._id as string);
			if (preview) {
				linkPreview = {
					url: preview.url,
					title: preview.title,
					description: preview.description,
					imageUrl: preview.imageUrl,
					siteName: preview.siteName,
					domain: preview.domain,
				};
			}
		}

		const topComment = getTopCommentFromMaps(
			"post",
			post._id as string,
			currentUserId,
			commentsByTarget,
			likesByTarget,
			usersById,
		);

		items.push({
			type: "post",
			id: post._id,
			createdAt: post._creationTime,
			updatedAt: post.updatedAt,
			editCount: post.editCount,
			author: {
				_id: author._id,
				clerkId: author.clerkId,
				username: author.username,
				displayName: author.displayName,
				avatarUrl: author.avatarUrl,
			},
			content: post.content,
			images: postImages.map((img) => ({
				url: img.url,
				caption: img.caption,
			})),
			linkPreview,
			mentions: post.mentions,
			likeCount: postLikes.length,
			commentCount: postComments.length,
			hasLiked: currentUserId
				? postLikes.some((l) => l.userId === currentUserId)
				: false,
			topComment,
		});
	}

	// Process articles
	for (const article of articles) {
		const author = usersById.get(article.authorId as string);
		if (!author) continue;

		const gameJunctions = articleGamesByArticleId.get(article._id as string) || [];
		const games = gameJunctions
			.map((j) => gamesById.get(j.gameId as string))
			.filter(Boolean) as Doc<"games">[];

		const articleLikes = likesByTarget.get(`article-${article._id}`) || [];
		const articleComments = commentsByTarget.get(`article-${article._id}`) || [];

		const topComment = getTopCommentFromMaps(
			"article",
			article._id as string,
			currentUserId,
			commentsByTarget,
			likesByTarget,
			usersById,
		);

		const igdbArticleGenres = [
			...new Set(games.flatMap((g) => g.genres || [])),
		];
		const articleGenres =
			article.genres && article.genres.length > 0
				? article.genres
				: igdbArticleGenres;

		items.push({
			type: "article",
			id: article._id,
			createdAt: article._creationTime,
			updatedAt: article.updatedAt,
			editCount: article.editCount,
			author: {
				_id: author._id,
				clerkId: author.clerkId,
				username: author.username,
				displayName: author.displayName,
				avatarUrl: author.avatarUrl,
			},
			content: article.content,
			title: article.title,
			excerpt: article.excerpt || undefined,
			tags: article.tags || undefined,
			genres: articleGenres.length > 0 ? articleGenres : undefined,
			games: games.map((g) => ({
				_id: g._id,
				name: g.name,
				slug: g.slug,
				coverUrl: g.coverUrl,
			})),
			mentions: article.mentions,
			likeCount: articleLikes.length,
			commentCount: articleComments.length,
			hasLiked: currentUserId
				? articleLikes.some((l) => l.userId === currentUserId)
				: false,
			topComment,
		});
	}

	// Process reviews
	for (const review of reviews) {
		const author = usersById.get(review.authorId as string);
		if (!author) continue;

		const game = gamesById.get(review.gameId as string);
		const reviewLikes = likesByTarget.get(`review-${review._id}`) || [];
		const reviewComments = commentsByTarget.get(`review-${review._id}`) || [];

		const topComment = getTopCommentFromMaps(
			"review",
			review._id as string,
			currentUserId,
			commentsByTarget,
			likesByTarget,
			usersById,
		);

		items.push({
			type: "review",
			id: review._id,
			createdAt: review._creationTime,
			updatedAt: review.updatedAt,
			editCount: review.editCount,
			author: {
				_id: author._id,
				clerkId: author.clerkId,
				username: author.username,
				displayName: author.displayName,
				avatarUrl: author.avatarUrl,
			},
			content: review.content,
			title: review.title,
			coverImageUrl: review.coverImageUrl,
			containsSpoilers: review.containsSpoilers,
			rating: review.rating,
			tags: review.tags || undefined,
			genres:
				review.genres && review.genres.length > 0
					? review.genres
					: game?.genres && game.genres.length > 0
						? game.genres
						: undefined,
			game: game
				? {
						_id: game._id,
						name: game.name,
						slug: game.slug,
						coverUrl: game.coverUrl,
					}
				: undefined,
			mentions: review.mentions,
			likeCount: reviewLikes.length,
			commentCount: reviewComments.length,
			hasLiked: currentUserId
				? reviewLikes.some((l) => l.userId === currentUserId)
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

export const getReviews = query({
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

		const reviews = await ctx.db
			.query("reviews")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 2);

		const items = await enrichItems(ctx, [], [], reviews, currentUserId);

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

export const getPopularReviews = query({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
		clerkId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;
		const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;

		let currentUserId: Id<"users"> | null = null;
		if (args.clerkId) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
				.unique();
			currentUserId = user?._id ?? null;
		}

		const allReviews = await ctx.db
			.query("reviews")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.take(limit * 3);
		const reviews = allReviews.filter(
			(r) => r._creationTime >= last7Days,
		);

		const items = await enrichItems(ctx, [], [], reviews, currentUserId);

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
