// Server functions for draft management
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { deleteUploadThingFiles } from "./uploadthing";

const MAX_DRAFTS_PER_USER = 10;

// ============================================
// Article Draft Functions
// ============================================

export const saveArticleDraft = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			draftId?: string; // If provided, update existing draft
			title?: string;
			content?: string; // TipTap JSON string
			excerpt?: string;
			coverImageUrl?: string;
			coverFileKey?: string;
			containsSpoilers?: boolean;
			gameIds?: string[];
			authorClerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.authorClerkId },
		});
		if (!user) throw new Error("User not found");

		// If updating existing draft
		if (data.draftId) {
			const existingDraft = await prisma.articleDraft.findUnique({
				where: { id: data.draftId },
				select: { authorId: true },
			});

			if (!existingDraft || existingDraft.authorId !== user.id) {
				throw new Error("Draft not found or unauthorized");
			}

			return prisma.articleDraft.update({
				where: { id: data.draftId },
				data: {
					title: data.title,
					content: data.content,
					excerpt: data.excerpt,
					coverImageUrl: data.coverImageUrl,
					coverFileKey: data.coverFileKey,
					containsSpoilers: data.containsSpoilers,
					gameIds: data.gameIds,
				},
			});
		}

		// Creating new draft - check limit
		const draftCount = await prisma.articleDraft.count({
			where: { authorId: user.id },
		});

		if (draftCount >= MAX_DRAFTS_PER_USER) {
			// Delete oldest draft (and its images)
			const oldestDraft = await prisma.articleDraft.findFirst({
				where: { authorId: user.id },
				orderBy: { updatedAt: "asc" },
				include: { images: { select: { url: true } } },
			});

			if (oldestDraft) {
				// Collect URLs to delete
				const urlsToDelete: string[] = [];
				if (oldestDraft.coverImageUrl) {
					urlsToDelete.push(oldestDraft.coverImageUrl);
				}
				for (const img of oldestDraft.images) {
					urlsToDelete.push(img.url);
				}

				// Delete images from UploadThing
				await deleteUploadThingFiles(urlsToDelete);

				// Delete the draft (cascade deletes ArticleDraftImage records)
				await prisma.articleDraft.delete({
					where: { id: oldestDraft.id },
				});
			}
		}

		// Create new draft
		return prisma.articleDraft.create({
			data: {
				title: data.title,
				content: data.content,
				excerpt: data.excerpt,
				coverImageUrl: data.coverImageUrl,
				coverFileKey: data.coverFileKey,
				containsSpoilers: data.containsSpoilers ?? false,
				gameIds: data.gameIds ?? [],
				authorId: user.id,
			},
		});
	});

export const getArticleDrafts = createServerFn({
	method: "GET",
})
	.inputValidator((clerkId: string) => clerkId)
	.handler(async ({ data: clerkId }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId },
		});
		if (!user) return [];

		return prisma.articleDraft.findMany({
			where: { authorId: user.id },
			orderBy: { updatedAt: "desc" },
			include: {
				images: true,
			},
		});
	});

export const getArticleDraftById = createServerFn({
	method: "GET",
})
	.inputValidator((data: { draftId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const draft = await prisma.articleDraft.findUnique({
			where: { id: data.draftId },
			include: { images: true },
		});

		if (!draft || draft.authorId !== user.id) {
			throw new Error("Draft not found or unauthorized");
		}

		return draft;
	});

export const deleteArticleDraft = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: { draftId: string; clerkId: string; preserveImages?: boolean }) =>
			data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const draft = await prisma.articleDraft.findUnique({
			where: { id: data.draftId },
			include: { images: { select: { url: true } } },
		});

		if (!draft || draft.authorId !== user.id) {
			throw new Error("Draft not found or unauthorized");
		}

		// Only delete images if preserveImages is false (default)
		if (!data.preserveImages) {
			// Collect URLs to delete
			const urlsToDelete: string[] = [];
			if (draft.coverImageUrl) {
				urlsToDelete.push(draft.coverImageUrl);
			}
			for (const img of draft.images) {
				urlsToDelete.push(img.url);
			}

			// Delete images from UploadThing
			await deleteUploadThingFiles(urlsToDelete);
		}

		// Delete the draft
		await prisma.articleDraft.delete({
			where: { id: data.draftId },
		});

		return { success: true };
	});

// Add an image to an article draft
export const addArticleDraftImage = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			draftId: string;
			url: string;
			fileKey: string;
			caption?: string;
			clerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const draft = await prisma.articleDraft.findUnique({
			where: { id: data.draftId },
			select: { authorId: true },
		});

		if (!draft || draft.authorId !== user.id) {
			throw new Error("Draft not found or unauthorized");
		}

		return prisma.articleDraftImage.create({
			data: {
				url: data.url,
				fileKey: data.fileKey,
				caption: data.caption,
				draftId: data.draftId,
			},
		});
	});

// ============================================
// Review Draft Functions
// ============================================

export const saveReviewDraft = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			draftId?: string;
			title?: string;
			content?: string; // TipTap JSON string
			rating?: number;
			coverImageUrl?: string;
			coverFileKey?: string;
			containsSpoilers?: boolean;
			gameId?: string;
			authorClerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.authorClerkId },
		});
		if (!user) throw new Error("User not found");

		// Validate rating if provided
		if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
			throw new Error("Rating must be between 1 and 5");
		}

		// If updating existing draft
		if (data.draftId) {
			const existingDraft = await prisma.reviewDraft.findUnique({
				where: { id: data.draftId },
				select: { authorId: true },
			});

			if (!existingDraft || existingDraft.authorId !== user.id) {
				throw new Error("Draft not found or unauthorized");
			}

			return prisma.reviewDraft.update({
				where: { id: data.draftId },
				data: {
					title: data.title,
					content: data.content,
					rating: data.rating,
					coverImageUrl: data.coverImageUrl,
					coverFileKey: data.coverFileKey,
					containsSpoilers: data.containsSpoilers,
					gameId: data.gameId,
				},
			});
		}

		// Creating new draft - check limit
		const draftCount = await prisma.reviewDraft.count({
			where: { authorId: user.id },
		});

		if (draftCount >= MAX_DRAFTS_PER_USER) {
			// Delete oldest draft (and its images)
			const oldestDraft = await prisma.reviewDraft.findFirst({
				where: { authorId: user.id },
				orderBy: { updatedAt: "asc" },
				include: { images: { select: { url: true } } },
			});

			if (oldestDraft) {
				// Collect URLs to delete
				const urlsToDelete: string[] = [];
				if (oldestDraft.coverImageUrl) {
					urlsToDelete.push(oldestDraft.coverImageUrl);
				}
				for (const img of oldestDraft.images) {
					urlsToDelete.push(img.url);
				}

				// Delete images from UploadThing
				await deleteUploadThingFiles(urlsToDelete);

				// Delete the draft
				await prisma.reviewDraft.delete({
					where: { id: oldestDraft.id },
				});
			}
		}

		// Create new draft
		return prisma.reviewDraft.create({
			data: {
				title: data.title,
				content: data.content,
				rating: data.rating,
				coverImageUrl: data.coverImageUrl,
				coverFileKey: data.coverFileKey,
				containsSpoilers: data.containsSpoilers ?? false,
				gameId: data.gameId,
				authorId: user.id,
			},
		});
	});

export const getReviewDrafts = createServerFn({
	method: "GET",
})
	.inputValidator((clerkId: string) => clerkId)
	.handler(async ({ data: clerkId }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId },
		});
		if (!user) return [];

		return prisma.reviewDraft.findMany({
			where: { authorId: user.id },
			orderBy: { updatedAt: "desc" },
			include: {
				images: true,
			},
		});
	});

export const getReviewDraftById = createServerFn({
	method: "GET",
})
	.inputValidator((data: { draftId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const draft = await prisma.reviewDraft.findUnique({
			where: { id: data.draftId },
			include: { images: true },
		});

		if (!draft || draft.authorId !== user.id) {
			throw new Error("Draft not found or unauthorized");
		}

		return draft;
	});

export const deleteReviewDraft = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: { draftId: string; clerkId: string; preserveImages?: boolean }) =>
			data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const draft = await prisma.reviewDraft.findUnique({
			where: { id: data.draftId },
			include: { images: { select: { url: true } } },
		});

		if (!draft || draft.authorId !== user.id) {
			throw new Error("Draft not found or unauthorized");
		}

		// Only delete images if preserveImages is false (default)
		if (!data.preserveImages) {
			// Collect URLs to delete
			const urlsToDelete: string[] = [];
			if (draft.coverImageUrl) {
				urlsToDelete.push(draft.coverImageUrl);
			}
			for (const img of draft.images) {
				urlsToDelete.push(img.url);
			}

			// Delete images from UploadThing
			await deleteUploadThingFiles(urlsToDelete);
		}

		// Delete the draft
		await prisma.reviewDraft.delete({
			where: { id: data.draftId },
		});

		return { success: true };
	});

// Add an image to a review draft
export const addReviewDraftImage = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			draftId: string;
			url: string;
			fileKey: string;
			caption?: string;
			clerkId: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId: data.clerkId },
		});
		if (!user) throw new Error("User not found");

		const draft = await prisma.reviewDraft.findUnique({
			where: { id: data.draftId },
			select: { authorId: true },
		});

		if (!draft || draft.authorId !== user.id) {
			throw new Error("Draft not found or unauthorized");
		}

		return prisma.reviewDraftImage.create({
			data: {
				url: data.url,
				fileKey: data.fileKey,
				caption: data.caption,
				draftId: data.draftId,
			},
		});
	});

// ============================================
// Combined Draft Functions
// ============================================

// Get all drafts for a user (both articles and reviews)
export const getAllDrafts = createServerFn({
	method: "GET",
})
	.inputValidator((clerkId: string) => clerkId)
	.handler(async ({ data: clerkId }) => {
		const user = await prisma.user.findUnique({
			where: { clerkId },
		});
		if (!user) return { articleDrafts: [], reviewDrafts: [] };

		const [articleDrafts, reviewDrafts] = await Promise.all([
			prisma.articleDraft.findMany({
				where: { authorId: user.id },
				orderBy: { updatedAt: "desc" },
			}),
			prisma.reviewDraft.findMany({
				where: { authorId: user.id },
				orderBy: { updatedAt: "desc" },
			}),
		]);

		return { articleDrafts, reviewDrafts };
	});
