import { internalMutation } from "../_generated/server";

/**
 * One-time migration to convert existing "Completed" entries to "Beaten".
 *
 * After this migration:
 * - "Beaten" = Finished main story/campaign
 * - "Completed" = 100% completion (all achievements, side content, etc.)
 *
 * Run this migration with:
 * npx convex run migrations/migrateCompletedToBeaten:migrateCompletedToBeaten
 */
export const migrateCompletedToBeaten = internalMutation({
	handler: async (ctx) => {
		const entries = await ctx.db
			.query("questLogs")
			.filter((q) => q.eq(q.field("status"), "Completed"))
			.collect();

		for (const entry of entries) {
			await ctx.db.patch(entry._id, { status: "Beaten" });
		}

		return { migrated: entries.length };
	},
});
