// Server functions for image management and cleanup
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { deleteUploadThingFile, deleteUploadThingFiles } from "./uploadthing";

// Delete all images associated with an article
export const deleteArticleImages = createServerFn({
	method: "POST",
})
	.inputValidator((data: { articleId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		// Verify ownership
		const article = await prisma.article.findUnique({
			where: { id: data.articleId },
			include: {
				author: { select: { clerkId: true } },
				images: { select: { url: true } },
			},
		});

		if (!article || article.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		// Collect all image URLs to delete
		const urlsToDelete: string[] = [];

		if (article.coverImageUrl) {
			urlsToDelete.push(article.coverImageUrl);
		}

		for (const image of article.images) {
			urlsToDelete.push(image.url);
		}

		// Delete from UploadThing
		await deleteUploadThingFiles(urlsToDelete);

		// Images will be deleted from DB via cascade when article is deleted
		return { success: true, deletedCount: urlsToDelete.length };
	});

// Delete all images associated with a review
export const deleteReviewImages = createServerFn({
	method: "POST",
})
	.inputValidator((data: { reviewId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		// Verify ownership
		const review = await prisma.review.findUnique({
			where: { id: data.reviewId },
			include: {
				author: { select: { clerkId: true } },
				images: { select: { url: true } },
			},
		});

		if (!review || review.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		// Collect all image URLs to delete
		const urlsToDelete: string[] = [];

		if (review.coverImageUrl) {
			urlsToDelete.push(review.coverImageUrl);
		}

		for (const image of review.images) {
			urlsToDelete.push(image.url);
		}

		// Delete from UploadThing
		await deleteUploadThingFiles(urlsToDelete);

		// Images will be deleted from DB via cascade when review is deleted
		return { success: true, deletedCount: urlsToDelete.length };
	});

// Delete all images associated with an article draft
export const deleteArticleDraftImages = createServerFn({
	method: "POST",
})
	.inputValidator((data: { draftId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		// Verify ownership
		const draft = await prisma.articleDraft.findUnique({
			where: { id: data.draftId },
			include: {
				author: { select: { clerkId: true } },
				images: { select: { url: true } },
			},
		});

		if (!draft || draft.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		// Collect all image URLs to delete
		const urlsToDelete: string[] = [];

		if (draft.coverImageUrl) {
			urlsToDelete.push(draft.coverImageUrl);
		}

		for (const image of draft.images) {
			urlsToDelete.push(image.url);
		}

		// Delete from UploadThing
		await deleteUploadThingFiles(urlsToDelete);

		return { success: true, deletedCount: urlsToDelete.length };
	});

// Delete all images associated with a review draft
export const deleteReviewDraftImages = createServerFn({
	method: "POST",
})
	.inputValidator((data: { draftId: string; clerkId: string }) => data)
	.handler(async ({ data }) => {
		// Verify ownership
		const draft = await prisma.reviewDraft.findUnique({
			where: { id: data.draftId },
			include: {
				author: { select: { clerkId: true } },
				images: { select: { url: true } },
			},
		});

		if (!draft || draft.author.clerkId !== data.clerkId) {
			throw new Error("Unauthorized");
		}

		// Collect all image URLs to delete
		const urlsToDelete: string[] = [];

		if (draft.coverImageUrl) {
			urlsToDelete.push(draft.coverImageUrl);
		}

		for (const image of draft.images) {
			urlsToDelete.push(image.url);
		}

		// Delete from UploadThing
		await deleteUploadThingFiles(urlsToDelete);

		return { success: true, deletedCount: urlsToDelete.length };
	});

// Clean up orphaned images when content is edited
// Compare old image URLs with new ones and delete removed images
export async function cleanupRemovedImages(
	oldUrls: string[],
	newUrls: string[],
): Promise<void> {
	const newUrlSet = new Set(newUrls);
	const removedUrls = oldUrls.filter((url) => !newUrlSet.has(url));

	if (removedUrls.length > 0) {
		await deleteUploadThingFiles(removedUrls);
	}
}

// Delete a single image by URL
export const deleteSingleImage = createServerFn({
	method: "POST",
})
	.inputValidator((url: string) => url)
	.handler(async ({ data: url }) => {
		await deleteUploadThingFile(url);
		return { success: true };
	});
