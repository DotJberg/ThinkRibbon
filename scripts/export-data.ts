// Export all PostgreSQL tables as JSONL for Convex import
// Run: npx tsx scripts/export-data.ts
// Output: exports/<table>.jsonl

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const OUTPUT_DIR = join(import.meta.dirname, "..", "exports");

function toUnixMs(date: Date | null | undefined): number | undefined {
	if (!date) return undefined;
	return date.getTime();
}

function writeLine(lines: string[], record: Record<string, unknown>) {
	// Strip undefined values
	const clean: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(record)) {
		if (v !== undefined) clean[k] = v;
	}
	lines.push(JSON.stringify(clean));
}

async function exportTable(
	name: string,
	fetchFn: () => Promise<string[]>,
): Promise<void> {
	console.log(`Exporting ${name}...`);
	const lines = await fetchFn();
	const path = join(OUTPUT_DIR, `${name}.jsonl`);
	writeFileSync(path, lines.join("\n") + "\n");
	console.log(`  -> ${lines.length} records written to ${path}`);
}

async function main() {
	mkdirSync(OUTPUT_DIR, { recursive: true });

	// 1. Users (no FK deps)
	await exportTable("users", async () => {
		const rows = await prisma.user.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				clerkId: r.clerkId,
				email: r.email,
				username: r.username,
				displayName: r.displayName ?? undefined,
				avatarUrl: r.avatarUrl ?? undefined,
				bannerUrl: r.bannerUrl ?? undefined,
				bio: r.bio ?? undefined,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 2. Games (no FK deps)
	await exportTable("games", async () => {
		const rows = await prisma.game.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				igdbId: r.igdbId,
				name: r.name,
				slug: r.slug,
				summary: r.summary ?? undefined,
				coverUrl: r.coverUrl ?? undefined,
				releaseDate: toUnixMs(r.releaseDate),
				genres: r.genres,
				platforms: r.platforms,
				rating: r.rating ?? undefined,
				cachedAt: toUnixMs(r.cachedAt),
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 3. Follows (depends on users)
	await exportTable("follows", async () => {
		const rows = await prisma.follow.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				followerId: r.followerId, // legacy cuid, resolved later
				followingId: r.followingId,
			});
		}
		return lines;
	});

	// 4. Posts (depends on users)
	await exportTable("posts", async () => {
		const rows = await prisma.post.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				content: r.content,
				authorId: r.authorId,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 5. Articles (depends on users)
	await exportTable("articles", async () => {
		const rows = await prisma.article.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				title: r.title,
				content: r.content,
				contentJson: r.contentJson ?? undefined,
				excerpt: r.excerpt ?? undefined,
				coverImageUrl: r.coverImageUrl ?? undefined,
				coverFileKey: r.coverFileKey ?? undefined,
				containsSpoilers: r.containsSpoilers,
				published: r.published,
				authorId: r.authorId,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 6. ArticleGames (depends on articles, games)
	await exportTable("articleGames", async () => {
		const rows = await prisma.articleGame.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				articleId: r.articleId,
				gameId: r.gameId,
			});
		}
		return lines;
	});

	// 7. ArticleImages (depends on articles)
	await exportTable("articleImages", async () => {
		const rows = await prisma.articleImage.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				url: r.url,
				fileKey: r.fileKey,
				caption: r.caption ?? undefined,
				articleId: r.articleId,
			});
		}
		return lines;
	});

	// 8. Reviews (depends on users, games)
	await exportTable("reviews", async () => {
		const rows = await prisma.review.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				title: r.title,
				content: r.content,
				contentJson: r.contentJson ?? undefined,
				rating: r.rating,
				coverImageUrl: r.coverImageUrl ?? undefined,
				coverFileKey: r.coverFileKey ?? undefined,
				containsSpoilers: r.containsSpoilers,
				published: r.published,
				authorId: r.authorId,
				gameId: r.gameId,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 9. ReviewImages (depends on reviews)
	await exportTable("reviewImages", async () => {
		const rows = await prisma.reviewImage.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				url: r.url,
				fileKey: r.fileKey,
				caption: r.caption ?? undefined,
				reviewId: r.reviewId,
			});
		}
		return lines;
	});

	// 10. Comments (polymorphic -> targetType + targetId)
	await exportTable("comments", async () => {
		const rows = await prisma.comment.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			let targetType: string;
			let targetId: string;
			if (r.postId) {
				targetType = "post";
				targetId = r.postId;
			} else if (r.articleId) {
				targetType = "article";
				targetId = r.articleId;
			} else if (r.reviewId) {
				targetType = "review";
				targetId = r.reviewId;
			} else {
				// Orphaned comment, skip
				console.warn(`  Warning: orphaned comment ${r.id}, skipping`);
				continue;
			}

			writeLine(lines, {
				legacyId: r.id,
				content: r.content,
				authorId: r.authorId,
				targetType,
				targetId,
				parentId: r.parentId ?? undefined,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 11. Likes (polymorphic -> targetType + targetId)
	await exportTable("likes", async () => {
		const rows = await prisma.like.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			let targetType: string;
			let targetId: string;
			if (r.postId) {
				targetType = "post";
				targetId = r.postId;
			} else if (r.articleId) {
				targetType = "article";
				targetId = r.articleId;
			} else if (r.reviewId) {
				targetType = "review";
				targetId = r.reviewId;
			} else if (r.commentId) {
				targetType = "comment";
				targetId = r.commentId;
			} else {
				console.warn(`  Warning: orphaned like ${r.id}, skipping`);
				continue;
			}

			writeLine(lines, {
				legacyId: r.id,
				userId: r.userId,
				targetType,
				targetId,
			});
		}
		return lines;
	});

	// 12. ArticleDrafts (depends on users)
	await exportTable("articleDrafts", async () => {
		const rows = await prisma.articleDraft.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				title: r.title ?? undefined,
				content: r.content ?? undefined,
				excerpt: r.excerpt ?? undefined,
				coverImageUrl: r.coverImageUrl ?? undefined,
				coverFileKey: r.coverFileKey ?? undefined,
				containsSpoilers: r.containsSpoilers,
				gameIds: r.gameIds,
				authorId: r.authorId,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 13. ArticleDraftImages (depends on articleDrafts)
	await exportTable("articleDraftImages", async () => {
		const rows = await prisma.articleDraftImage.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				url: r.url,
				fileKey: r.fileKey,
				caption: r.caption ?? undefined,
				draftId: r.draftId,
			});
		}
		return lines;
	});

	// 14. ReviewDrafts (depends on users)
	await exportTable("reviewDrafts", async () => {
		const rows = await prisma.reviewDraft.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				title: r.title ?? undefined,
				content: r.content ?? undefined,
				rating: r.rating ?? undefined,
				coverImageUrl: r.coverImageUrl ?? undefined,
				coverFileKey: r.coverFileKey ?? undefined,
				containsSpoilers: r.containsSpoilers,
				gameId: r.gameId ?? undefined,
				authorId: r.authorId,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	// 15. ReviewDraftImages (depends on reviewDrafts)
	await exportTable("reviewDraftImages", async () => {
		const rows = await prisma.reviewDraftImage.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				url: r.url,
				fileKey: r.fileKey,
				caption: r.caption ?? undefined,
				draftId: r.draftId,
			});
		}
		return lines;
	});

	// 16. QuestLogs (depends on users, games)
	await exportTable("questLogs", async () => {
		const rows = await prisma.questLog.findMany();
		const lines: string[] = [];
		for (const r of rows) {
			writeLine(lines, {
				legacyId: r.id,
				userId: r.userId,
				gameId: r.gameId,
				status: r.status,
				startedAt: toUnixMs(r.startedAt),
				completedAt: toUnixMs(r.completedAt),
				hoursPlayed: r.hoursPlayed ?? undefined,
				notes: r.notes ?? undefined,
				quickRating: r.quickRating ?? undefined,
				displayOnProfile: r.displayOnProfile,
				displayOrder: r.displayOrder,
				updatedAt: toUnixMs(r.updatedAt),
			});
		}
		return lines;
	});

	console.log("\nExport complete!");
	console.log(`Files written to: ${OUTPUT_DIR}/`);
	console.log("\nImport order:");
	console.log("  1. npx convex import --table users exports/users.jsonl");
	console.log("  2. npx convex import --table games exports/games.jsonl");
	console.log("  3. npx convex import --table follows exports/follows.jsonl");
	console.log("  4. npx convex import --table posts exports/posts.jsonl");
	console.log("  5. npx convex import --table articles exports/articles.jsonl");
	console.log(
		"  6. npx convex import --table articleGames exports/articleGames.jsonl",
	);
	console.log(
		"  7. npx convex import --table articleImages exports/articleImages.jsonl",
	);
	console.log("  8. npx convex import --table reviews exports/reviews.jsonl");
	console.log(
		"  9. npx convex import --table reviewImages exports/reviewImages.jsonl",
	);
	console.log(
		"  10. npx convex import --table comments exports/comments.jsonl",
	);
	console.log("  11. npx convex import --table likes exports/likes.jsonl");
	console.log(
		"  12. npx convex import --table articleDrafts exports/articleDrafts.jsonl",
	);
	console.log(
		"  13. npx convex import --table articleDraftImages exports/articleDraftImages.jsonl",
	);
	console.log(
		"  14. npx convex import --table reviewDrafts exports/reviewDrafts.jsonl",
	);
	console.log(
		"  15. npx convex import --table reviewDraftImages exports/reviewDraftImages.jsonl",
	);
	console.log(
		"  16. npx convex import --table questLogs exports/questLogs.jsonl",
	);
	console.log(
		"\nThen run: npx convex run migrate:resolveAllReferences to resolve FK references",
	);

	await prisma.$disconnect();
}

main().catch((err) => {
	console.error("Export failed:", err);
	process.exit(1);
});
