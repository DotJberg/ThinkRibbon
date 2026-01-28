import { verifyToken } from "@clerk/backend";
import {
	createUploadthing,
	type FileRouter,
	UploadThingError,
	UTApi,
} from "uploadthing/server";
import { prisma } from "@/db";

const f = createUploadthing();
const utapi = new UTApi();

// Helper to extract file key from UploadThing URL and delete the file
async function deleteOldUploadThingFile(url: string | null): Promise<void> {
	if (!url) return;

	// Only delete UploadThing files (ufs.sh or utfs.io domains)
	if (!url.includes("ufs.sh") && !url.includes("utfs.io")) return;

	try {
		// Extract file key from URL
		// Format: https://<appId>.ufs.sh/f/<fileKey> or https://utfs.io/f/<fileKey>
		const match = url.match(/\/f\/([^/?]+)/);
		if (match?.[1]) {
			await utapi.deleteFiles(match[1]);
		}
	} catch {
		// Silently fail - don't block upload if deletion fails
	}
}

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
		console.error("[UploadThing Auth] No session cookie found");
		throw new UploadThingError("Unauthorized - No session");
	}

	try {
		const payload = await verifyToken(sessionToken, {
			secretKey: process.env.CLERK_SECRET_KEY,
		});

		if (payload.sub) {
			return { userId: payload.sub };
		}

		console.error("[UploadThing Auth] No user ID in token payload");
		throw new UploadThingError("Unauthorized - No user in token");
	} catch (error) {
		if (error instanceof UploadThingError) throw error;
		console.error("[UploadThing Auth] Token verification failed:", error);
		throw new UploadThingError("Unauthorized - Token verification failed");
	}
};

export const uploadRouter = {
	profilePicture: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			// Use ufsUrl with fallback to url for compatibility
			const url = file.ufsUrl || file.url;
			console.log(
				"[UploadThing] Profile picture upload complete:",
				metadata.userId,
				url,
			);

			try {
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

				console.log("[UploadThing] Profile picture saved to database");
				return { uploadedBy: metadata.userId, url };
			} catch (error) {
				console.error("[UploadThing] Failed to save profile picture:", error);
				throw error;
			}
		}),

	banner: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			// Use ufsUrl with fallback to url for compatibility
			const url = file.ufsUrl || file.url;
			console.log(
				"[UploadThing] Banner upload complete:",
				metadata.userId,
				url,
			);

			try {
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

				console.log("[UploadThing] Banner saved to database");
				return { uploadedBy: metadata.userId, url };
			} catch (error) {
				console.error("[UploadThing] Failed to save banner:", error);
				throw error;
			}
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
