import { verifyToken } from "@clerk/backend";
import {
	createUploadthing,
	type FileRouter,
	UploadThingError,
} from "uploadthing/server";
import { prisma } from "@/db";

const f = createUploadthing();

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
	const sessionToken = getCookie(cookieHeader, "__session");

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
			const url = file.ufsUrl;
			await prisma.user.update({
				where: { clerkId: metadata.userId },
				data: { avatarUrl: url },
			});
			return { uploadedBy: metadata.userId, url };
		}),

	banner: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
		.middleware(authMiddleware)
		.onUploadComplete(async ({ metadata, file }) => {
			const url = file.ufsUrl;
			await prisma.user.update({
				where: { clerkId: metadata.userId },
				data: { bannerUrl: url },
			});
			return { uploadedBy: metadata.userId, url };
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
