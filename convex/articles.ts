import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { createNotification } from "./notifications";

export const create = mutation({
	args: {
		title: v.string(),
		content: v.string(),
		contentJson: v.optional(v.string()),
		excerpt: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.optional(v.boolean()),
		tags: v.optional(v.array(v.string())),
		genres: v.optional(v.array(v.string())),
		gameIds: v.optional(v.array(v.id("games"))),
		published: v.optional(v.boolean()),
		authorClerkId: v.string(),
		mentions: v.optional(
			v.array(
				v.object({
					type: v.union(v.literal("user"), v.literal("game")),
					id: v.string(),
					slug: v.string(),
					displayText: v.string(),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.authorClerkId))
			.unique();
		if (!user) throw new Error("User not found");

		const articleId = await ctx.db.insert("articles", {
			title: args.title,
			content: args.content,
			contentJson: args.contentJson,
			excerpt: args.excerpt,
			coverImageUrl: args.coverImageUrl,
			coverFileKey: args.coverFileKey,
			containsSpoilers: args.containsSpoilers ?? false,
			tags: args.tags,
			genres: args.genres,
			published: args.published ?? false,
			authorId: user._id,
			updatedAt: Date.now(),
			mentions: args.mentions,
		});

		// Insert article-game junctions
		if (args.gameIds) {
			for (const gameId of args.gameIds) {
				await ctx.db.insert("articleGames", {
					articleId,
					gameId,
				});
			}
		}

		// Send mention notifications (only if published)
		if (args.mentions && args.published) {
			for (const mention of args.mentions) {
				if (mention.type === "user") {
					await createNotification(
						ctx,
						mention.id as Id<"users">,
						user._id,
						"mention_article",
						articleId,
					);
				}
			}
		}

		return articleId;
	},
});

export const update = mutation({
	args: {
		articleId: v.id("articles"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		contentJson: v.optional(v.string()),
		excerpt: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.optional(v.boolean()),
		tags: v.optional(v.array(v.string())),
		genres: v.optional(v.array(v.string())),
		gameIds: v.optional(v.array(v.id("games"))),
		published: v.optional(v.boolean()),
		saveHistory: v.optional(v.boolean()),
		clerkId: v.string(),
		mentions: v.optional(
			v.array(
				v.object({
					type: v.union(v.literal("user"), v.literal("game")),
					id: v.string(),
					slug: v.string(),
					displayText: v.string(),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const article = await ctx.db.get(args.articleId);
		if (!article) throw new Error("Article not found");

		const author = await ctx.db.get(article.authorId);
		const requestingUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		const isAdmin = requestingUser?.admin === true;
		if (!author || (author.clerkId !== args.clerkId && !isAdmin)) {
			throw new Error("Unauthorized");
		}

		// Save a version snapshot before patching (only on explicit save)
		if (args.saveHistory) {
			await ctx.db.insert("articleVersions", {
				articleId: args.articleId,
				title: article.title,
				content: article.content,
				contentJson: article.contentJson,
				excerpt: article.excerpt,
				coverImageUrl: article.coverImageUrl,
				containsSpoilers: article.containsSpoilers,
				editedAt: Date.now(),
			});
		}

		// Update game junctions if provided
		if (args.gameIds) {
			const existingGames = await ctx.db
				.query("articleGames")
				.withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
				.collect();
			for (const ag of existingGames) {
				await ctx.db.delete(ag._id);
			}
			for (const gameId of args.gameIds) {
				await ctx.db.insert("articleGames", {
					articleId: args.articleId,
					gameId,
				});
			}
		}

		const updateData: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.title !== undefined) updateData.title = args.title;
		if (args.content !== undefined) updateData.content = args.content;
		if (args.contentJson !== undefined)
			updateData.contentJson = args.contentJson;
		if (args.excerpt !== undefined) updateData.excerpt = args.excerpt;
		if (args.coverImageUrl !== undefined)
			updateData.coverImageUrl = args.coverImageUrl;
		if (args.coverFileKey !== undefined)
			updateData.coverFileKey = args.coverFileKey;
		if (args.containsSpoilers !== undefined)
			updateData.containsSpoilers = args.containsSpoilers;
		if (args.tags !== undefined) updateData.tags = args.tags;
		if (args.genres !== undefined) updateData.genres = args.genres;
		if (args.published !== undefined) updateData.published = args.published;
		if (args.mentions !== undefined) updateData.mentions = args.mentions;
		if (args.saveHistory) {
			updateData.editCount = (article.editCount ?? 0) + 1;
		}

		await ctx.db.patch(args.articleId, updateData);

		// Send mention notifications for newly added mentions (only if published)
		const isPublished = args.published ?? article.published;
		if (args.mentions && isPublished) {
			const oldMentionIds = new Set(
				(article.mentions || [])
					.filter((m) => m.type === "user")
					.map((m) => m.id),
			);
			for (const mention of args.mentions) {
				if (mention.type === "user" && !oldMentionIds.has(mention.id)) {
					await createNotification(
						ctx,
						mention.id as Id<"users">,
						article.authorId,
						"mention_article",
						args.articleId,
					);
				}
			}
		}

		return args.articleId;
	},
});

export const getById = query({
	args: { articleId: v.id("articles") },
	handler: async (ctx, args) => {
		const article = await ctx.db.get(args.articleId);
		if (!article) return null;

		const author = await ctx.db.get(article.authorId);
		const gameJunctions = await ctx.db
			.query("articleGames")
			.withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
			.collect();

		const games = await Promise.all(
			gameJunctions.map(async (ag) => {
				const game = await ctx.db.get(ag.gameId);
				return game;
			}),
		);

		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "article").eq("targetId", args.articleId),
			)
			.collect();

		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "article").eq("targetId", args.articleId),
			)
			.collect();

		return {
			...article,
			author: author
				? {
						_id: author._id,
						username: author.username,
						displayName: author.displayName,
						avatarUrl: author.avatarUrl,
						clerkId: author.clerkId,
					}
				: null,
			games: games.filter(Boolean),
			_count: { likes: likes.length, comments: comments.length },
		};
	},
});

export const getHistory = query({
	args: { articleId: v.id("articles") },
	handler: async (ctx, args) => {
		const article = await ctx.db.get(args.articleId);
		if (!article) return null;

		const versions = await ctx.db
			.query("articleVersions")
			.withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
			.order("desc")
			.collect();

		return {
			current: {
				title: article.title,
				content: article.content,
				contentJson: article.contentJson,
				excerpt: article.excerpt,
				coverImageUrl: article.coverImageUrl,
				containsSpoilers: article.containsSpoilers,
				editedAt: article.updatedAt ?? article._creationTime,
			},
			versions: versions.map((v) => ({
				_id: v._id,
				title: v.title,
				content: v.content,
				contentJson: v.contentJson,
				excerpt: v.excerpt,
				coverImageUrl: v.coverImageUrl,
				containsSpoilers: v.containsSpoilers,
				editedAt: v.editedAt,
			})),
		};
	},
});

export const getFeed = query({
	args: {
		cursor: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 10;

		let allArticles = await ctx.db
			.query("articles")
			.withIndex("by_published", (q) => q.eq("published", true))
			.order("desc")
			.collect();

		// Apply cursor
		if (args.cursor) {
			const idx = allArticles.findIndex((a) => a._id === args.cursor);
			if (idx !== -1) allArticles = allArticles.slice(idx + 1);
		}

		const paginated = allArticles.slice(0, limit + 1);
		let nextCursor: string | undefined;
		if (paginated.length > limit) {
			const last = paginated.pop()!;
			nextCursor = last._id;
		}

		const enriched = await Promise.all(
			paginated.map(async (article) => {
				const author = await ctx.db.get(article.authorId);
				const gameJunctions = await ctx.db
					.query("articleGames")
					.withIndex("by_articleId", (q) => q.eq("articleId", article._id))
					.collect();
				const games = (
					await Promise.all(gameJunctions.map((ag) => ctx.db.get(ag.gameId)))
				).filter(Boolean);

				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "article").eq("targetId", article._id),
					)
					.collect();
				const comments = await ctx.db
					.query("comments")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "article").eq("targetId", article._id),
					)
					.collect();

				return {
					...article,
					author: author
						? {
								_id: author._id,
								username: author.username,
								displayName: author.displayName,
								avatarUrl: author.avatarUrl,
							}
						: null,
					games: games.map((g) => ({
						_id: g!._id,
						name: g!.name,
						slug: g!.slug,
						coverUrl: g!.coverUrl,
					})),
					_count: { likes: likes.length, comments: comments.length },
				};
			}),
		);

		return { articles: enriched, nextCursor };
	},
});

export const getByUser = query({
	args: {
		username: v.string(),
		includeUnpublished: v.optional(v.boolean()),
		clerkId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const targetUser = await ctx.db
			.query("users")
			.withIndex("by_username", (q) => q.eq("username", args.username))
			.unique();
		if (!targetUser) return [];

		let currentUserId: Id<"users"> | null = null;
		if (args.clerkId) {
			const currentUser = await ctx.db
				.query("users")
				.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
				.unique();
			currentUserId = currentUser?._id ?? null;
		}

		let articles = await ctx.db
			.query("articles")
			.withIndex("by_authorId", (q) => q.eq("authorId", targetUser._id))
			.order("desc")
			.collect();

		if (!args.includeUnpublished) {
			articles = articles.filter((a) => a.published);
		}

		return Promise.all(
			articles.map(async (article) => {
				const gameJunctions = await ctx.db
					.query("articleGames")
					.withIndex("by_articleId", (q) => q.eq("articleId", article._id))
					.collect();
				const games = (
					await Promise.all(gameJunctions.map((ag) => ctx.db.get(ag.gameId)))
				).filter(Boolean);

				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "article").eq("targetId", article._id),
					)
					.collect();
				const comments = await ctx.db
					.query("comments")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "article").eq("targetId", article._id),
					)
					.collect();

				const hasLiked = currentUserId
					? likes.some((l) => l.userId === currentUserId)
					: false;

				return {
					...article,
					author: {
						_id: targetUser._id,
						clerkId: targetUser.clerkId,
						username: targetUser.username,
						displayName: targetUser.displayName,
						avatarUrl: targetUser.avatarUrl,
					},
					games: games.map((g) => ({
						_id: g!._id,
						name: g!.name,
						slug: g!.slug,
						coverUrl: g!.coverUrl,
					})),
					_count: { likes: likes.length, comments: comments.length },
					hasLiked,
				};
			}),
		);
	},
});

export const getByGame = query({
	args: { gameId: v.id("games") },
	handler: async (ctx, args) => {
		const junctions = await ctx.db
			.query("articleGames")
			.withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
			.collect();

		const articles = (
			await Promise.all(
				junctions.map(async (j) => {
					const article = await ctx.db.get(j.articleId);
					if (!article || !article.published) return null;
					return article;
				}),
			)
		).filter(Boolean);

		// Sort by creation time desc
		articles.sort((a, b) => b!._creationTime - a!._creationTime);

		return Promise.all(
			articles.map(async (article) => {
				const author = await ctx.db.get(article!.authorId);
				const likes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "article").eq("targetId", article!._id),
					)
					.collect();
				const comments = await ctx.db
					.query("comments")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "article").eq("targetId", article!._id),
					)
					.collect();

				return {
					...article,
					author: author
						? {
								_id: author._id,
								username: author.username,
								displayName: author.displayName,
								avatarUrl: author.avatarUrl,
							}
						: null,
					_count: { likes: likes.length, comments: comments.length },
				};
			}),
		);
	},
});

export const deleteArticle = mutation({
	args: { articleId: v.id("articles"), clerkId: v.string() },
	handler: async (ctx, args) => {
		const article = await ctx.db.get(args.articleId);
		if (!article) throw new Error("Article not found");

		const author = await ctx.db.get(article.authorId);
		const requestingUser = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		const isAdmin = requestingUser?.admin === true;
		if (!author || (author.clerkId !== args.clerkId && !isAdmin)) {
			throw new Error("Unauthorized");
		}

		// Cascade: article versions
		const versions = await ctx.db
			.query("articleVersions")
			.withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
			.collect();
		for (const ver of versions) await ctx.db.delete(ver._id);

		// Cascade: game junctions
		const junctions = await ctx.db
			.query("articleGames")
			.withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
			.collect();
		for (const j of junctions) await ctx.db.delete(j._id);

		// Cascade: images
		const images = await ctx.db
			.query("articleImages")
			.withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
			.collect();
		for (const img of images) await ctx.db.delete(img._id);

		// Cascade: likes
		const likes = await ctx.db
			.query("likes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "article").eq("targetId", args.articleId),
			)
			.collect();
		for (const like of likes) await ctx.db.delete(like._id);

		// Cascade: comments and their likes
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", "article").eq("targetId", args.articleId),
			)
			.collect();
		for (const comment of comments) {
			const commentLikes = await ctx.db
				.query("likes")
				.withIndex("by_target", (q) =>
					q.eq("targetType", "comment").eq("targetId", comment._id),
				)
				.collect();
			for (const cl of commentLikes) await ctx.db.delete(cl._id);
			const replies = await ctx.db
				.query("comments")
				.withIndex("by_parentId", (q) => q.eq("parentId", comment._id))
				.collect();
			for (const reply of replies) {
				const replyLikes = await ctx.db
					.query("likes")
					.withIndex("by_target", (q) =>
						q.eq("targetType", "comment").eq("targetId", reply._id),
					)
					.collect();
				for (const rl of replyLikes) await ctx.db.delete(rl._id);
				await ctx.db.delete(reply._id);
			}
			await ctx.db.delete(comment._id);
		}

		await ctx.db.delete(args.articleId);
		return { success: true };
	},
});
