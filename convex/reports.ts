import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
	args: {
		clerkId: v.string(),
		targetType: v.union(
			v.literal("post"),
			v.literal("article"),
			v.literal("review"),
		),
		targetId: v.string(),
		message: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user) throw new Error("User not found");

		// Check if target exists
		if (args.targetType === "post") {
			const post = await ctx.db.get(args.targetId as Id<"posts">);
			if (!post) throw new Error("Post not found");
		} else if (args.targetType === "article") {
			const article = await ctx.db.get(args.targetId as Id<"articles">);
			if (!article) throw new Error("Article not found");
		} else if (args.targetType === "review") {
			const review = await ctx.db.get(args.targetId as Id<"reviews">);
			if (!review) throw new Error("Review not found");
		}

		// Check for duplicate report
		const existing = await ctx.db
			.query("reports")
			.withIndex("by_reporterId", (q) => q.eq("reporterId", user._id))
			.collect();
		const duplicate = existing.find(
			(r) => r.targetType === args.targetType && r.targetId === args.targetId,
		);
		if (duplicate) throw new Error("You have already reported this content");

		return ctx.db.insert("reports", {
			reporterId: user._id,
			targetType: args.targetType,
			targetId: args.targetId,
			message: args.message,
			createdAt: Date.now(),
		});
	},
});

async function getTargetPreview(
	ctx: { db: { get: (id: Id<"posts"> | Id<"articles"> | Id<"reviews"> | Id<"users">) => Promise<unknown> } },
	targetType: "post" | "article" | "review",
	targetId: string,
): Promise<{ authorUsername?: string; title?: string; content?: string }> {
	if (targetType === "post") {
		const post = await ctx.db.get(targetId as Id<"posts">) as { authorId: Id<"users">; content: string } | null;
		if (post) {
			const author = await ctx.db.get(post.authorId) as { username: string } | null;
			return {
				authorUsername: author?.username,
				content: post.content.slice(0, 100),
			};
		}
	} else if (targetType === "article") {
		const article = await ctx.db.get(targetId as Id<"articles">) as { authorId: Id<"users">; title: string } | null;
		if (article) {
			const author = await ctx.db.get(article.authorId) as { username: string } | null;
			return {
				authorUsername: author?.username,
				title: article.title,
			};
		}
	} else if (targetType === "review") {
		const review = await ctx.db.get(targetId as Id<"reviews">) as { authorId: Id<"users">; title: string } | null;
		if (review) {
			const author = await ctx.db.get(review.authorId) as { username: string } | null;
			return {
				authorUsername: author?.username,
				title: review.title,
			};
		}
	}
	return {};
}

export const hasPending = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user || !user.admin) return false;

		const first = await ctx.db
			.query("reports")
			.withIndex("by_createdAt")
			.first();
		return first !== null;
	},
});

export const getAll = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user || !user.admin) return [];

		const reports = await ctx.db
			.query("reports")
			.withIndex("by_createdAt")
			.order("desc")
			.collect();

		return Promise.all(
			reports.map(async (report) => {
				const reporter = await ctx.db.get(report.reporterId);
				const targetPreview = await getTargetPreview(
					ctx as Parameters<typeof getTargetPreview>[0],
					report.targetType,
					report.targetId,
				);

				return {
					...report,
					reporter: reporter
						? {
								_id: reporter._id,
								username: reporter.username,
								displayName: reporter.displayName,
								avatarUrl: reporter.avatarUrl,
							}
						: null,
					targetPreview,
				};
			}),
		);
	},
});

export const resolve = mutation({
	args: {
		reportId: v.id("reports"),
		clerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user || !user.admin) throw new Error("Unauthorized");

		const report = await ctx.db.get(args.reportId);
		if (!report) throw new Error("Report not found");

		// Move to completedReports
		await ctx.db.insert("completedReports", {
			reporterId: report.reporterId,
			targetType: report.targetType,
			targetId: report.targetId,
			message: report.message,
			createdAt: report.createdAt,
			addressedById: user._id,
			addressedAt: Date.now(),
		});

		// Delete from active reports
		await ctx.db.delete(args.reportId);

		return { success: true };
	},
});

export const getCompleted = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		if (!user || !user.admin) return [];

		const reports = await ctx.db
			.query("completedReports")
			.withIndex("by_addressedAt")
			.order("desc")
			.collect();

		return Promise.all(
			reports.map(async (report) => {
				const reporter = await ctx.db.get(report.reporterId);
				const addressedBy = await ctx.db.get(report.addressedById);
				const targetPreview = await getTargetPreview(
					ctx as Parameters<typeof getTargetPreview>[0],
					report.targetType,
					report.targetId,
				);

				return {
					...report,
					reporter: reporter
						? {
								_id: reporter._id,
								username: reporter.username,
								displayName: reporter.displayName,
								avatarUrl: reporter.avatarUrl,
							}
						: null,
					addressedBy: addressedBy
						? {
								_id: addressedBy._id,
								username: addressedBy.username,
								displayName: addressedBy.displayName,
							}
						: null,
					targetPreview,
				};
			}),
		);
	},
});
