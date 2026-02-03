import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// One-time migration: resolve legacy cuid FK strings to real Convex _id values
// Run: npx convex run migrate:resolveAllReferences
export const resolveAllReferences = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log("Starting FK resolution...");

		// Build legacyId -> _id maps for each table
		const userMap = new Map<string, Id<"users">>();
		const gameMap = new Map<string, Id<"games">>();
		const postMap = new Map<string, Id<"posts">>();
		const articleMap = new Map<string, Id<"articles">>();
		const reviewMap = new Map<string, Id<"reviews">>();
		const commentMap = new Map<string, Id<"comments">>();
		const articleDraftMap = new Map<string, Id<"articleDrafts">>();
		const reviewDraftMap = new Map<string, Id<"reviewDrafts">>();

		// Populate maps
		for (const u of await ctx.db.query("users").collect()) {
			if (u.legacyId) userMap.set(u.legacyId, u._id);
		}
		for (const g of await ctx.db.query("games").collect()) {
			if (g.legacyId) gameMap.set(g.legacyId, g._id);
		}
		for (const p of await ctx.db.query("posts").collect()) {
			if (p.legacyId) postMap.set(p.legacyId, p._id);
		}
		for (const a of await ctx.db.query("articles").collect()) {
			if (a.legacyId) articleMap.set(a.legacyId, a._id);
		}
		for (const r of await ctx.db.query("reviews").collect()) {
			if (r.legacyId) reviewMap.set(r.legacyId, r._id);
		}
		for (const c of await ctx.db.query("comments").collect()) {
			if (c.legacyId) commentMap.set(c.legacyId, c._id);
		}
		for (const d of await ctx.db.query("articleDrafts").collect()) {
			if (d.legacyId) articleDraftMap.set(d.legacyId, d._id);
		}
		for (const d of await ctx.db.query("reviewDrafts").collect()) {
			if (d.legacyId) reviewDraftMap.set(d.legacyId, d._id);
		}

		console.log(`Maps built: ${userMap.size} users, ${gameMap.size} games, ${postMap.size} posts, ${articleMap.size} articles, ${reviewMap.size} reviews, ${commentMap.size} comments`);

		// Resolve follows
		let resolved = 0;
		for (const f of await ctx.db.query("follows").collect()) {
			const followerId = userMap.get(f.followerId as unknown as string);
			const followingId = userMap.get(f.followingId as unknown as string);
			if (followerId && followingId) {
				await ctx.db.patch(f._id, {
					followerId,
					followingId,
				});
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} follows`);

		// Resolve posts.authorId
		resolved = 0;
		for (const p of await ctx.db.query("posts").collect()) {
			const authorId = userMap.get(p.authorId as unknown as string);
			if (authorId) {
				await ctx.db.patch(p._id, { authorId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} posts`);

		// Resolve articles.authorId
		resolved = 0;
		for (const a of await ctx.db.query("articles").collect()) {
			const authorId = userMap.get(a.authorId as unknown as string);
			if (authorId) {
				await ctx.db.patch(a._id, { authorId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} articles`);

		// Resolve articleGames
		resolved = 0;
		for (const ag of await ctx.db.query("articleGames").collect()) {
			const articleId = articleMap.get(ag.articleId as unknown as string);
			const gameId = gameMap.get(ag.gameId as unknown as string);
			if (articleId && gameId) {
				await ctx.db.patch(ag._id, { articleId, gameId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} articleGames`);

		// Resolve articleImages
		resolved = 0;
		for (const img of await ctx.db.query("articleImages").collect()) {
			const articleId = articleMap.get(img.articleId as unknown as string);
			if (articleId) {
				await ctx.db.patch(img._id, { articleId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} articleImages`);

		// Resolve reviews.authorId and reviews.gameId
		resolved = 0;
		for (const r of await ctx.db.query("reviews").collect()) {
			const authorId = userMap.get(r.authorId as unknown as string);
			const gameId = gameMap.get(r.gameId as unknown as string);
			if (authorId || gameId) {
				await ctx.db.patch(r._id, {
					...(authorId ? { authorId } : {}),
					...(gameId ? { gameId } : {}),
				});
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} reviews`);

		// Resolve reviewImages
		resolved = 0;
		for (const img of await ctx.db.query("reviewImages").collect()) {
			const reviewId = reviewMap.get(img.reviewId as unknown as string);
			if (reviewId) {
				await ctx.db.patch(img._id, { reviewId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} reviewImages`);

		// Resolve comments
		resolved = 0;
		for (const c of await ctx.db.query("comments").collect()) {
			const authorId = userMap.get(c.authorId as unknown as string);
			let targetId = c.targetId;

			// Resolve targetId based on targetType
			if (c.targetType === "post") {
				const newId = postMap.get(c.targetId);
				if (newId) targetId = newId;
			} else if (c.targetType === "article") {
				const newId = articleMap.get(c.targetId);
				if (newId) targetId = newId;
			} else if (c.targetType === "review") {
				const newId = reviewMap.get(c.targetId);
				if (newId) targetId = newId;
			}

			const parentId = c.parentId
				? commentMap.get(c.parentId as unknown as string)
				: undefined;

			await ctx.db.patch(c._id, {
				...(authorId ? { authorId } : {}),
				targetId,
				...(parentId ? { parentId } : {}),
			});
			resolved++;
		}
		console.log(`Resolved ${resolved} comments`);

		// Resolve likes
		resolved = 0;
		for (const l of await ctx.db.query("likes").collect()) {
			const userId = userMap.get(l.userId as unknown as string);
			let targetId = l.targetId;

			if (l.targetType === "post") {
				const newId = postMap.get(l.targetId);
				if (newId) targetId = newId;
			} else if (l.targetType === "article") {
				const newId = articleMap.get(l.targetId);
				if (newId) targetId = newId;
			} else if (l.targetType === "review") {
				const newId = reviewMap.get(l.targetId);
				if (newId) targetId = newId;
			} else if (l.targetType === "comment") {
				const newId = commentMap.get(l.targetId);
				if (newId) targetId = newId;
			}

			await ctx.db.patch(l._id, {
				...(userId ? { userId } : {}),
				targetId,
			});
			resolved++;
		}
		console.log(`Resolved ${resolved} likes`);

		// Resolve articleDrafts.authorId
		resolved = 0;
		for (const d of await ctx.db.query("articleDrafts").collect()) {
			const authorId = userMap.get(d.authorId as unknown as string);
			if (authorId) {
				await ctx.db.patch(d._id, { authorId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} articleDrafts`);

		// Resolve articleDraftImages.draftId
		resolved = 0;
		for (const img of await ctx.db.query("articleDraftImages").collect()) {
			const draftId = articleDraftMap.get(img.draftId as unknown as string);
			if (draftId) {
				await ctx.db.patch(img._id, { draftId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} articleDraftImages`);

		// Resolve reviewDrafts.authorId
		resolved = 0;
		for (const d of await ctx.db.query("reviewDrafts").collect()) {
			const authorId = userMap.get(d.authorId as unknown as string);
			if (authorId) {
				await ctx.db.patch(d._id, { authorId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} reviewDrafts`);

		// Resolve reviewDraftImages.draftId
		resolved = 0;
		for (const img of await ctx.db.query("reviewDraftImages").collect()) {
			const draftId = reviewDraftMap.get(img.draftId as unknown as string);
			if (draftId) {
				await ctx.db.patch(img._id, { draftId });
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} reviewDraftImages`);

		// Resolve questLogs.userId and questLogs.gameId
		resolved = 0;
		for (const q of await ctx.db.query("questLogs").collect()) {
			const userId = userMap.get(q.userId as unknown as string);
			const gameId = gameMap.get(q.gameId as unknown as string);
			if (userId || gameId) {
				await ctx.db.patch(q._id, {
					...(userId ? { userId } : {}),
					...(gameId ? { gameId } : {}),
				});
				resolved++;
			}
		}
		console.log(`Resolved ${resolved} questLogs`);

		console.log("FK resolution complete!");
	},
});
