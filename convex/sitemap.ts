import { query } from "./_generated/server";

export const getEntries = query({
	handler: async (ctx) => {
		const [articles, reviews, games, users, posts] = await Promise.all([
			ctx.db
				.query("articles")
				.filter((q) => q.eq(q.field("published"), true))
				.collect(),
			ctx.db
				.query("reviews")
				.filter((q) => q.eq(q.field("published"), true))
				.collect(),
			ctx.db.query("games").collect(),
			ctx.db.query("users").collect(),
			ctx.db.query("posts").collect(),
		]);

		return {
			articles: articles.map((a) => ({
				id: a._id,
				updatedAt: a.updatedAt || a._creationTime,
			})),
			reviews: reviews.map((r) => ({
				id: r._id,
				updatedAt: r.updatedAt || r._creationTime,
			})),
			games: games.map((g) => ({
				slug: g.slug,
				updatedAt: g.updatedAt || g.cachedAt,
			})),
			users: users.map((u) => ({
				username: u.username,
				updatedAt: u.updatedAt || u._creationTime,
			})),
			posts: posts.map((p) => ({
				id: p._id,
				updatedAt: p.updatedAt || p._creationTime,
			})),
		};
	},
});
