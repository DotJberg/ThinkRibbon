import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		clerkId: v.string(),
		email: v.string(),
		username: v.string(),
		displayName: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		bannerUrl: v.optional(v.string()),
		bio: v.optional(v.string()),
		updatedAt: v.optional(v.number()),
		admin: v.optional(v.boolean()),
	})
		.index("by_clerkId", ["clerkId"])
		.index("by_email", ["email"])
		.index("by_username", ["username"]),

	follows: defineTable({
		followerId: v.id("users"),
		followingId: v.id("users"),
			})
		.index("by_followerId", ["followerId"])
		.index("by_followingId", ["followingId"])
		.index("by_pair", ["followerId", "followingId"]),

	games: defineTable({
		igdbId: v.number(),
		name: v.string(),
		slug: v.string(),
		summary: v.optional(v.string()),
		coverUrl: v.optional(v.string()),
		releaseDate: v.optional(v.number()),
		genres: v.array(v.string()),
		platforms: v.array(v.string()),
		rating: v.optional(v.number()),
		hypes: v.optional(v.number()), // IGDB hype count for upcoming games
		cachedAt: v.number(),
		updatedAt: v.optional(v.number()),
		categoryLabel: v.optional(v.string()), // DLC, Expansion, Remake, etc.
	})
		.index("by_igdbId", ["igdbId"])
		.index("by_slug", ["slug"])
		.index("by_name", ["name"]),

	posts: defineTable({
		content: v.string(),
		authorId: v.id("users"),
		editCount: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
			})
		.index("by_authorId", ["authorId"]),

	postVersions: defineTable({
		postId: v.id("posts"),
		content: v.string(),
		editedAt: v.number(),
	}).index("by_postId", ["postId"]),

	postImages: defineTable({
		url: v.string(),
		fileKey: v.string(),
		caption: v.optional(v.string()),
		postId: v.id("posts"),
			}).index("by_postId", ["postId"]),

	postLinkPreviews: defineTable({
		postId: v.id("posts"),
		url: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		siteName: v.optional(v.string()),
		domain: v.string(),
	}).index("by_postId", ["postId"]),

	articles: defineTable({
		title: v.string(),
		content: v.string(),
		contentJson: v.optional(v.string()),
		excerpt: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.boolean(),
		published: v.boolean(),
		authorId: v.id("users"),
		tags: v.optional(v.array(v.string())),
		editCount: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
			})
		.index("by_authorId", ["authorId"])
		.index("by_published", ["published"]),

	articleVersions: defineTable({
		articleId: v.id("articles"),
		title: v.string(),
		content: v.string(),
		contentJson: v.optional(v.string()),
		excerpt: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		containsSpoilers: v.boolean(),
		editedAt: v.number(),
	}).index("by_articleId", ["articleId"]),

	articleGames: defineTable({
		articleId: v.id("articles"),
		gameId: v.id("games"),
			})
		.index("by_articleId", ["articleId"])
		.index("by_gameId", ["gameId"]),

	articleImages: defineTable({
		url: v.string(),
		fileKey: v.string(),
		caption: v.optional(v.string()),
		articleId: v.id("articles"),
			}).index("by_articleId", ["articleId"]),

	reviews: defineTable({
		title: v.string(),
		content: v.string(),
		contentJson: v.optional(v.string()),
		rating: v.number(),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.boolean(),
		published: v.boolean(),
		authorId: v.id("users"),
		gameId: v.id("games"),
		tags: v.optional(v.array(v.string())),
		editCount: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
			})
		.index("by_authorId", ["authorId"])
		.index("by_gameId", ["gameId"])
		.index("by_authorId_gameId", ["authorId", "gameId"])
		.index("by_published", ["published"]),

	reviewVersions: defineTable({
		reviewId: v.id("reviews"),
		title: v.string(),
		content: v.string(),
		contentJson: v.optional(v.string()),
		rating: v.number(),
		coverImageUrl: v.optional(v.string()),
		containsSpoilers: v.boolean(),
		editedAt: v.number(),
	}).index("by_reviewId", ["reviewId"]),

	reviewImages: defineTable({
		url: v.string(),
		fileKey: v.string(),
		caption: v.optional(v.string()),
		reviewId: v.id("reviews"),
			}).index("by_reviewId", ["reviewId"]),

	comments: defineTable({
		content: v.string(),
		authorId: v.id("users"),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
		),
		targetId: v.string(),
		parentId: v.optional(v.id("comments")),
		updatedAt: v.optional(v.number()),
			})
		.index("by_authorId", ["authorId"])
		.index("by_target", ["targetType", "targetId"])
		.index("by_parentId", ["parentId"]),

	likes: defineTable({
		userId: v.id("users"),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
			v.literal("comment"),
		),
		targetId: v.string(),
			})
		.index("by_userId", ["userId"])
		.index("by_target", ["targetType", "targetId"])
		.index("by_user_target", ["userId", "targetType", "targetId"]),

	articleDrafts: defineTable({
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		excerpt: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.boolean(),
		gameIds: v.array(v.string()),
		tags: v.optional(v.array(v.string())),
		authorId: v.id("users"),
		updatedAt: v.optional(v.number()),
			}).index("by_authorId", ["authorId"]),

	articleDraftImages: defineTable({
		url: v.string(),
		fileKey: v.string(),
		caption: v.optional(v.string()),
		draftId: v.id("articleDrafts"),
			}).index("by_draftId", ["draftId"]),

	reviewDrafts: defineTable({
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		rating: v.optional(v.number()),
		coverImageUrl: v.optional(v.string()),
		coverFileKey: v.optional(v.string()),
		containsSpoilers: v.boolean(),
		gameId: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		authorId: v.id("users"),
		updatedAt: v.optional(v.number()),
			}).index("by_authorId", ["authorId"]),

	reviewDraftImages: defineTable({
		url: v.string(),
		fileKey: v.string(),
		caption: v.optional(v.string()),
		draftId: v.id("reviewDrafts"),
			}).index("by_draftId", ["draftId"]),

	questLogs: defineTable({
		userId: v.id("users"),
		gameId: v.id("games"),
		status: v.union(
			v.literal("Playing"),
			v.literal("Beaten"),
			v.literal("Completed"),
			v.literal("OnHold"),
			v.literal("Dropped"),
			v.literal("Backlog"),
		),
		platform: v.optional(v.string()), // Platform played on for this playthrough
		difficulty: v.optional(v.string()), // Difficulty setting (e.g., "Hard", "Story Mode")
		startedAt: v.optional(v.number()),
		completedAt: v.optional(v.number()),
		hoursPlayed: v.optional(v.number()),
		notes: v.optional(v.string()),
		quickRating: v.optional(v.number()),
		displayOnProfile: v.boolean(),
		displayOrder: v.number(),
		updatedAt: v.optional(v.number()),
	})
		.index("by_userId_gameId", ["userId", "gameId"])
		.index("by_userId_status", ["userId", "status"])
		.index("by_userId_display", ["userId", "displayOnProfile"])
		.index("by_userId", ["userId"])
		.index("by_gameId", ["gameId"]),

	collections: defineTable({
		userId: v.id("users"),
		gameId: v.id("games"),
		ownershipType: v.union(
			v.literal("Physical"),
			v.literal("Digital"),
		),
		status: v.optional(
			v.union(
				v.literal("Unplayed"),
				v.literal("Playing"),
				v.literal("Beaten"),
				v.literal("Completed"),
				v.literal("OnHold"),
				v.literal("Dropped"),
				v.literal("Backlog"),
			),
		),
		platform: v.optional(v.string()), // Platform owned on
		difficulty: v.optional(v.string()), // Difficulty setting planned/used
		hoursPlayed: v.optional(v.number()),
		acquiredAt: v.optional(v.number()),
		notes: v.optional(v.string()), // Deprecated - kept for backwards compatibility
		updatedAt: v.optional(v.number()),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_gameId", ["userId", "gameId"])
		.index("by_gameId", ["gameId"]),

	reports: defineTable({
		reporterId: v.id("users"),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
		),
		targetId: v.string(),
		message: v.string(),
		createdAt: v.number(),
	})
		.index("by_reporterId", ["reporterId"])
		.index("by_target", ["targetType", "targetId"])
		.index("by_createdAt", ["createdAt"]),

	notifications: defineTable({
		userId: v.id("users"),
		actorId: v.id("users"),
		type: v.union(
			v.literal("like_post"),
			v.literal("like_article"),
			v.literal("like_review"),
			v.literal("like_comment"),
			v.literal("comment_post"),
			v.literal("comment_article"),
			v.literal("comment_review"),
			v.literal("reply_comment"),
		),
		targetId: v.string(),
		viewedAt: v.optional(v.number()),
	})
		.index("by_userId", ["userId"])
		.index("by_viewedAt", ["viewedAt"]),

	completedReports: defineTable({
		reporterId: v.id("users"),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
		),
		targetId: v.string(),
		message: v.string(),
		createdAt: v.number(),
		addressedById: v.id("users"),
		addressedAt: v.number(),
	})
		.index("by_addressedById", ["addressedById"])
		.index("by_addressedAt", ["addressedAt"]),
});
