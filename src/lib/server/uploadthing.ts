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
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
