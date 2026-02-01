// Server functions for quest log (game diary)
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import type { QuestLogStatus } from "../../generated/prisma/client.js";

// Type for status update with optional quick review
interface StatusUpdateData {
	clerkId: string;
	gameId: string;
	newStatus: QuestLogStatus;
	quickRating?: number; // 1-10
	shareAsPost?: boolean;
}

// Add a game to quest log
export const addToQuestLog = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			clerkId: string;
			gameId: string;
			status?: QuestLogStatus;
			startedAt?: Date;
			notes?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		// Check if game exists
		const game = await prisma.game.findUnique({
			where: { id: data.gameId },
		});
		if (!game) throw new Error("Game not found");

		// Check current count of displayed games for ordering
		const displayCount = await prisma.questLog.count({
			where: { userId: user.id, displayOnProfile: true },
		});

		return prisma.questLog.create({
			data: {
				userId: user.id,
				gameId: data.gameId,
				status: data.status || "Playing",
				startedAt: data.startedAt || new Date(),
				notes: data.notes,
				displayOnProfile: true,
				displayOrder: Math.min(displayCount, 4), // 0-4 for display
			},
			include: {
				game: true,
			},
		});
	});

// Get quest log entry for a specific game
export const getQuestLogEntry = createServerFn({
	method: "GET",
})
	.inputValidator((data: { clerkId: string; gameId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) return null;

		return prisma.questLog.findUnique({
			where: {
				userId_gameId: { userId: user.id, gameId: data.gameId },
			},
			include: {
				game: true,
			},
		});
	});

// Update quest log entry
export const updateQuestLog = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			clerkId: string;
			questLogId: string;
			status?: QuestLogStatus;
			notes?: string;
			hoursPlayed?: number;
			displayOnProfile?: boolean;
			displayOrder?: number;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		// Verify ownership
		const questLog = await prisma.questLog.findUnique({
			where: { id: data.questLogId },
		});
		if (!questLog || questLog.userId !== user.id) {
			throw new Error("Unauthorized");
		}

		const updateData: Record<string, unknown> = {};
		if (data.status !== undefined) updateData.status = data.status;
		if (data.notes !== undefined) updateData.notes = data.notes;
		if (data.hoursPlayed !== undefined)
			updateData.hoursPlayed = data.hoursPlayed;
		if (data.displayOnProfile !== undefined)
			updateData.displayOnProfile = data.displayOnProfile;
		if (data.displayOrder !== undefined)
			updateData.displayOrder = data.displayOrder;

		// Set completedAt if status is Completed or Dropped
		if (data.status === "Completed" || data.status === "Dropped") {
			updateData.completedAt = new Date();
		}

		return prisma.questLog.update({
			where: { id: data.questLogId },
			data: updateData,
			include: { game: true },
		});
	});

// Update status with optional quick review and post generation
export const updateQuestLogStatus = createServerFn({
	method: "POST",
})
	.inputValidator((data: StatusUpdateData) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		// Find the quest log entry
		const questLog = await prisma.questLog.findFirst({
			where: { userId: user.id, gameId: data.gameId },
			include: { game: true },
		});
		if (!questLog) throw new Error("Quest log entry not found");

		// Update the quest log with new status and optional quick rating
		const updatedLog = await prisma.questLog.update({
			where: { id: questLog.id },
			data: {
				status: data.newStatus,
				quickRating: data.quickRating,
				completedAt:
					data.newStatus === "Completed" || data.newStatus === "Dropped"
						? new Date()
						: questLog.completedAt,
			},
			include: { game: true },
		});

		// Generate post if requested
		if (data.shareAsPost && data.quickRating) {
			const statusText = getStatusText(data.newStatus);
			const stars = getStarEmoji(data.quickRating);
			const content = `I just ${statusText} ${questLog.game.name}! ${stars}`;

			await prisma.post.create({
				data: {
					content: content.slice(0, 280),
					authorId: user.id,
				},
			});
		}

		return updatedLog;
	});

// Remove from quest log
export const removeFromQuestLog = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; questLogId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const questLog = await prisma.questLog.findUnique({
			where: { id: data.questLogId },
		});
		if (!questLog || questLog.userId !== user.id) {
			throw new Error("Unauthorized");
		}

		await prisma.questLog.delete({ where: { id: data.questLogId } });
		return { success: true };
	});

// Get "Now Playing" games for profile display (max 5)
export const getNowPlaying = createServerFn({
	method: "GET",
})
	.inputValidator((data: { username: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { username: data.username },
		});
		if (!user) return [];

		return prisma.questLog.findMany({
			where: {
				userId: user.id,
				displayOnProfile: true,
			},
			orderBy: { displayOrder: "asc" },
			take: 5,
			include: {
				game: true,
			},
		});
	});

// Get user's full quest log with filters
export const getUserQuestLog = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: {
			username: string;
			status?: QuestLogStatus;
			cursor?: string;
			limit?: number;
		}) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		const user = await prisma.user.findUnique({
			where: { username: data.username },
		});
		if (!user) return { entries: [], nextCursor: undefined };

		const where: Record<string, unknown> = { userId: user.id };
		if (data.status) where.status = data.status;

		const entries = await prisma.questLog.findMany({
			where,
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { updatedAt: "desc" },
			include: {
				game: true,
			},
		});

		let nextCursor: string | undefined;
		if (entries.length > limit) {
			const nextItem = entries.pop();
			nextCursor = nextItem?.id;
		}

		return { entries, nextCursor };
	});

// Get quest log timeline (recent activity)
export const getQuestLogTimeline = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { username: string; cursor?: string; limit?: number }) => data,
	)
	.handler(async ({ data }) => {
		const limit = data.limit || 20;

		const user = await prisma.user.findUnique({
			where: { username: data.username },
		});
		if (!user) return { entries: [], nextCursor: undefined };

		// Get entries sorted by most recent activity
		const entries = await prisma.questLog.findMany({
			where: { userId: user.id },
			take: limit + 1,
			cursor: data.cursor ? { id: data.cursor } : undefined,
			orderBy: { updatedAt: "desc" },
			include: {
				game: true,
			},
		});

		let nextCursor: string | undefined;
		if (entries.length > limit) {
			const nextItem = entries.pop();
			nextCursor = nextItem?.id;
		}

		return { entries, nextCursor };
	});

// Update display order for "Now Playing" games
export const updateDisplayOrder = createServerFn({
	method: "POST",
})
	.inputValidator((data: { clerkId: string; orderedIds: string[] }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		// Verify ownership and update order
		await Promise.all(
			data.orderedIds.slice(0, 5).map((id, index) =>
				prisma.questLog.updateMany({
					where: { id, userId: user.id },
					data: { displayOrder: index },
				}),
			),
		);

		return { success: true };
	});

// Get combined average rating for a game (reviews + quick ratings)
export const getGameCombinedRating = createServerFn({
	method: "GET",
})
	.inputValidator((data: { gameId: string }) => data)
	.handler(async ({ data }) => {
		// Get average from full reviews
		const reviewAvg = await prisma.review.aggregate({
			where: { gameId: data.gameId, published: true },
			_avg: { rating: true },
			_count: true,
		});

		// Get average from quick ratings
		const quickRatingAvg = await prisma.questLog.aggregate({
			where: { gameId: data.gameId, quickRating: { not: null } },
			_avg: { quickRating: true },
			_count: true,
		});

		const reviewCount = reviewAvg._count;
		const quickCount = quickRatingAvg._count;
		const totalCount = reviewCount + quickCount;

		if (totalCount === 0) return { averageRating: null, totalRatings: 0 };

		// Weighted average
		const reviewSum = (reviewAvg._avg.rating || 0) * reviewCount;
		const quickSum = (quickRatingAvg._avg.quickRating || 0) * quickCount;
		const averageRating = (reviewSum + quickSum) / totalCount;

		return {
			averageRating: Math.round(averageRating * 10) / 10,
			totalRatings: totalCount,
			reviewCount,
			quickRatingCount: quickCount,
		};
	});

// Helper function to convert status to readable text
function getStatusText(status: QuestLogStatus): string {
	switch (status) {
		case "Completed":
			return "completed";
		case "Dropped":
			return "dropped";
		case "OnHold":
			return "put on hold";
		case "Playing":
			return "started playing";
		case "Backlog":
			return "added to backlog";
		default:
			return "updated";
	}
}

// Helper function to generate star emoji from rating (1-10)
function getStarEmoji(rating: number): string {
	// Convert 1-10 to half stars (0.5 = half, 1 = full)
	const fullStars = Math.floor(rating / 2);
	const halfStar = rating % 2 >= 1;
	return "⭐".repeat(fullStars) + (halfStar ? "½" : "");
}
