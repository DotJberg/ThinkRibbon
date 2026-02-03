import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Collect all file keys referenced in the database
export const collectAllFileKeys = internalQuery({
	args: {},
	handler: async (ctx) => {
		const fileKeys = new Set<string>();

		// User avatars and banners
		const users = await ctx.db.query("users").collect();
		for (const user of users) {
			if (user.avatarUrl) fileKeys.add(user.avatarUrl);
			if (user.bannerUrl) fileKeys.add(user.bannerUrl);
		}

		// Post images
		const postImages = await ctx.db.query("postImages").collect();
		for (const img of postImages) {
			fileKeys.add(img.url);
		}

		// Article covers and images
		const articles = await ctx.db.query("articles").collect();
		for (const article of articles) {
			if (article.coverImageUrl) fileKeys.add(article.coverImageUrl);
		}
		const articleImages = await ctx.db.query("articleImages").collect();
		for (const img of articleImages) {
			fileKeys.add(img.url);
		}

		// Review covers and images
		const reviews = await ctx.db.query("reviews").collect();
		for (const review of reviews) {
			if (review.coverImageUrl) fileKeys.add(review.coverImageUrl);
		}
		const reviewImages = await ctx.db.query("reviewImages").collect();
		for (const img of reviewImages) {
			fileKeys.add(img.url);
		}

		// Draft covers and images
		const articleDrafts = await ctx.db.query("articleDrafts").collect();
		for (const draft of articleDrafts) {
			if (draft.coverImageUrl) fileKeys.add(draft.coverImageUrl);
		}
		const articleDraftImages = await ctx.db
			.query("articleDraftImages")
			.collect();
		for (const img of articleDraftImages) {
			fileKeys.add(img.url);
		}

		const reviewDrafts = await ctx.db.query("reviewDrafts").collect();
		for (const draft of reviewDrafts) {
			if (draft.coverImageUrl) fileKeys.add(draft.coverImageUrl);
		}
		const reviewDraftImages = await ctx.db
			.query("reviewDraftImages")
			.collect();
		for (const img of reviewDraftImages) {
			fileKeys.add(img.url);
		}

		return Array.from(fileKeys);
	},
});

function extractFileKey(url: string): string | null {
	const match = url.match(/\/f\/([^/?]+)/);
	return match?.[1] || null;
}

// Run cleanup - compare UploadThing files against database references
export const run = internalAction({
	args: {},
	handler: async (ctx) => {
		const dbUrls = await ctx.runQuery(internal.cleanup.collectAllFileKeys);
		const dbFileKeys = new Set(
			dbUrls
				.map((url: string) => extractFileKey(url))
				.filter((key: string | null): key is string => key !== null),
		);

		const token = process.env.UPLOADTHING_TOKEN;
		if (!token) {
			console.error("UPLOADTHING_TOKEN not set, skipping cleanup");
			return;
		}

		try {
			// List files from UploadThing
			const response = await fetch(
				"https://api.uploadthing.com/v6/listFiles",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Uploadthing-Api-Key": token,
					},
					body: JSON.stringify({ limit: 500 }),
				},
			);

			if (!response.ok) {
				console.error("Failed to list UploadThing files:", response.statusText);
				return;
			}

			const data = await response.json();
			const allFiles: Array<{ key: string }> = data.files || [];

			// Find orphaned files
			const orphanedKeys = allFiles
				.map((f) => f.key)
				.filter((key) => !dbFileKeys.has(key));

			if (orphanedKeys.length === 0) {
				console.log("No orphaned files found");
				return;
			}

			console.log(`Found ${orphanedKeys.length} orphaned files, deleting...`);

			// Delete orphaned files
			const deleteResponse = await fetch(
				"https://api.uploadthing.com/v6/deleteFiles",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Uploadthing-Api-Key": token,
					},
					body: JSON.stringify({ fileKeys: orphanedKeys }),
				},
			);

			if (!deleteResponse.ok) {
				console.error(
					"Failed to delete orphaned files:",
					deleteResponse.statusText,
				);
			} else {
				console.log(`Deleted ${orphanedKeys.length} orphaned files`);
			}
		} catch (err) {
			console.error("Cleanup failed:", err);
		}
	},
});
