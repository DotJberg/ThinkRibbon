import { verifyToken } from "@clerk/backend";
import {
	createUploadthing,
	type FileRouter,
	UploadThingError,
	UTApi,
} from "uploadthing/server";
import { prisma } from "@/db";
import { IMAGE_CONSTRAINTS } from "@/lib/image-utils";

const f = createUploadthing();
const utapi = new UTApi();

// Re-export for server use
export { IMAGE_CONSTRAINTS };

// Helper to extract file key from UploadThing URL
export function extractFileKey(url: string): string | null {
	// Format: https://<appId>.ufs.sh/f/<fileKey> or https://utfs.io/f/<fileKey>
	const match = url.match(/\/f\/([^/?]+)/);
	return match?.[1] || null;
}

// Helper to extract file key from UploadThing URL and delete the file
export async function deleteUploadThingFile(url: string | null): Promise<void> {
	if (!url) return;

	// Only delete UploadThing files (ufs.sh or utfs.io domains)
	if (!url.includes("ufs.sh") && !url.includes("utfs.io")) return;

	try {
		const fileKey = extractFileKey(url);
		if (fileKey) {
			await utapi.deleteFiles(fileKey);
		}
	} catch {
		// Silently fail - don't block upload if deletion fails
	}
}

// Delete multiple files
export async function deleteUploadThingFiles(urls: string[]): Promise<void> {
	const fileKeys = urls
		.filter((url) => url.includes("ufs.sh") || url.includes("utfs.io"))
		.map((url) => extractFileKey(url))
		.filter((key): key is string => key !== null);

	if (fileKeys.length > 0) {
		try {
			await utapi.deleteFiles(fileKeys);
		} catch {
			// Silently fail
		}
	}
}

// Alias for backward compatibility
const deleteOldUploadThingFile = deleteUploadThingFile;

// Helper to extract cookie value
function getCookie(cookieHeader: string, name: string): string | null {
	const cookies = cookieHeader.split(";").map((c) => c.trim());
	for (const cookie of cookies) {
		if (cookie.startsWith(`${name}=`)) {
			return cookie.substring(name.length + 1);
		}
	}
	return null;
}

const authMiddleware = async ({ req }: { req: Request }) => {
	const cookieHeader = req.headers.get("cookie") || "";

	// Try production cookie first, then development cookie
	const sessionToken =
		getCookie(cookieHeader, "__session") ||
		getCookie(cookieHeader, "__clerk_db_jwt");

	if (!sessionToken) {
		throw new UploadThingError("Unauthorized - No session");
	}

	try {
		const payload = await verifyToken(sessionToken, {
			secretKey: process.env.CLERK_SECRET_KEY,
		});

		if (payload.sub) {
			return { userId: payload.sub };
		}

		throw new UploadThingError("Unauthorized - No user in token");
	} catch (error) {
		if (error instanceof UploadThingError) throw error;
		throw new UploadThingError("Unauthorized - Token verification failed");
	}
};

export const uploadRouter = {
	profilePicture: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			const url = file.ufsUrl || file.url;

			// Get current avatar URL to delete old file
			const user = await prisma.user.findUnique({
				where: { clerkId: metadata.userId },
				select: { avatarUrl: true },
			});

			// Delete old avatar if it exists
			await deleteOldUploadThingFile(user?.avatarUrl ?? null);

			// Save new avatar URL
			await prisma.user.update({
				where: { clerkId: metadata.userId },
				data: { avatarUrl: url },
			});

			return { uploadedBy: metadata.userId, url };
		}),

	banner: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			const url = file.ufsUrl || file.url;

			// Get current banner URL to delete old file
			const user = await prisma.user.findUnique({
				where: { clerkId: metadata.userId },
				select: { bannerUrl: true },
			});

			// Delete old banner if it exists
			await deleteOldUploadThingFile(user?.bannerUrl ?? null);

			// Save new banner URL
			await prisma.user.update({
				where: { clerkId: metadata.userId },
				data: { bannerUrl: url },
			});

			return { uploadedBy: metadata.userId, url };
		}),

	// Article cover image - max 4MB, recommended 1920x1080
	articleCover: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			const url = file.ufsUrl || file.url;
			const fileKey = extractFileKey(url);

			return {
				uploadedBy: metadata.userId,
				url,
				fileKey,
				constraints: IMAGE_CONSTRAINTS.cover,
			};
		}),

	// Review cover image - max 4MB, recommended 1920x1080
	reviewCover: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			const url = file.ufsUrl || file.url;
			const fileKey = extractFileKey(url);

			return {
				uploadedBy: metadata.userId,
				url,
				fileKey,
				constraints: IMAGE_CONSTRAINTS.cover,
			};
		}),

	// Article inline image - max 2MB, recommended 1600x1600
	articleInlineImage: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			const url = file.ufsUrl || file.url;
			const fileKey = extractFileKey(url);

			return {
				uploadedBy: metadata.userId,
				url,
				fileKey,
				constraints: IMAGE_CONSTRAINTS.inline,
			};
		}),

	// Review inline image - max 2MB, recommended 1600x1600
	reviewInlineImage: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			const url = file.ufsUrl || file.url;
			const fileKey = extractFileKey(url);

			return {
				uploadedBy: metadata.userId,
				url,
				fileKey,
				constraints: IMAGE_CONSTRAINTS.inline,
			};
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
