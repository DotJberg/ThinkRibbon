import { createFileRoute } from "@tanstack/react-router";
import { UTApi } from "uploadthing/server";
import { prisma } from "@/db";
import { extractFileKey } from "@/lib/server/uploadthing";

// Initialize UploadThing API
const utapi = new UTApi();

export const Route = createFileRoute("/api/cron/cleanup")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					// 1. Verify Authorization
					const authHeader = request.headers.get("Authorization");
					const cronSecret = process.env.CRON_SECRET;

					// Check if running in Vercel Cron environment (automatically adds this header)
					// or if manually authenticated with secret
					if (
						authHeader !== `Bearer ${cronSecret}` &&
						request.headers.get("vercel-cron") !== "true"
					) {
						return new Response("Unauthorized", { status: 401 });
					}

					// 2. Fetch all valid file keys from database
					// We need to check all models that store file keys or URLs
					const [
						users,
						articles,
						articleImages,
						reviews,
						reviewImages,
						articleDrafts,
						articleDraftImages,
						reviewDrafts,
						reviewDraftImages,
					] = await Promise.all([
						// User avatars and banners
						prisma.user.findMany({
							select: { avatarUrl: true, bannerUrl: true },
							where: {
								OR: [
									{ avatarUrl: { not: null } },
									{ bannerUrl: { not: null } },
								],
							},
						}),
						// Published Articles
						prisma.article.findMany({
							select: { coverFileKey: true },
							where: { coverFileKey: { not: null } },
						}),
						prisma.articleImage.findMany({
							select: { fileKey: true },
						}),
						// Published Reviews
						prisma.review.findMany({
							select: { coverFileKey: true },
							where: { coverFileKey: { not: null } },
						}),
						prisma.reviewImage.findMany({
							select: { fileKey: true },
						}),
						// Drafts
						prisma.articleDraft.findMany({
							select: { coverFileKey: true },
							where: { coverFileKey: { not: null } },
						}),
						prisma.articleDraftImage.findMany({
							select: { fileKey: true },
						}),
						prisma.reviewDraft.findMany({
							select: { coverFileKey: true },
							where: { coverFileKey: { not: null } },
						}),
						prisma.reviewDraftImage.findMany({
							select: { fileKey: true },
						}),
					]);

					// Collect all valid keys into a Set for O(1) lookups
					const validKeys = new Set<string>();

					// Helper to add key if it exists
					const addKey = (key: string | null | undefined) => {
						if (key) validKeys.add(key);
					};

					// Helper to extract key from URL if needed (for legacy/mixed storage)
					const addUrl = (url: string | null | undefined) => {
						if (url) {
							const key = extractFileKey(url);
							if (key) validKeys.add(key);
						}
					};

					// Process Users
					users.forEach((user) => {
						addUrl(user.avatarUrl);
						addUrl(user.bannerUrl);
					});

					// Process Articles & Images
					articles.forEach((a) => {
						addKey(a.coverFileKey);
					});
					articleImages.forEach((img) => {
						addKey(img.fileKey);
					});

					// Process Reviews & Images
					reviews.forEach((r) => {
						addKey(r.coverFileKey);
					});
					reviewImages.forEach((img) => {
						addKey(img.fileKey);
					});

					// Process Drafts
					articleDrafts.forEach((d) => {
						addKey(d.coverFileKey);
					});
					articleDraftImages.forEach((img) => {
						addKey(img.fileKey);
					});
					reviewDrafts.forEach((d) => {
						addKey(d.coverFileKey);
					});
					reviewDraftImages.forEach((img) => {
						addKey(img.fileKey);
					});

					// 3. Fetch all files from UploadThing
					// Note: listFiles has a limit, we might need pagination if there are many files.
					// For now, let's assume < 500 files or implement simple pagination loop
					let hasMore = true;
					let offset = 0;
					const filesToDelete: string[] = [];
					let totalFilesScanned = 0;

					while (hasMore) {
						const { files, hasMore: more } = await utapi.listFiles({
							limit: 500,
							offset,
						});

						hasMore = more;
						offset += files.length;
						totalFilesScanned += files.length;

						// Check each file
						for (const file of files) {
							if (!validKeys.has(file.key)) {
								filesToDelete.push(file.key);
							}
						}
					}

					// 4. Delete orphaned files
					let deletedCount = 0;
					if (filesToDelete.length > 0) {
						// utapi.deleteFiles accepts string or string[]
						// Process in chunks of 50 just to be safe with payload sizes
						const chunkSize = 50;
						for (let i = 0; i < filesToDelete.length; i += chunkSize) {
							const chunk = filesToDelete.slice(i, i + chunkSize);
							await utapi.deleteFiles(chunk);
							deletedCount += chunk.length;
						}
					}

					return new Response(
						JSON.stringify({
							success: true,
							scanned: totalFilesScanned,
							deleted: deletedCount,
							orphans: filesToDelete.length,
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				} catch (error) {
					console.error("Cleanup job failed:", error);
					return new Response(
						JSON.stringify({ error: "Internal Server Error" }),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
		},
	},
});
