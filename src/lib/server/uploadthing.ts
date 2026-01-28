import { createUploadthing, type FileRouter } from "uploadthing/server";
import { UploadThingError } from "uploadthing/server";
import { getAuth } from "@clerk/tanstack-start/server";
import { prisma } from "@/db";

const f = createUploadthing();

const authMiddleware = async ({ req }: { req: Request }) => {
  const { userId } = await getAuth(req);

  if (!userId) {
    throw new UploadThingError("Unauthorized");
  }

  return { userId };
};

export const uploadRouter = {
  profilePicture: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.user.update({
        where: { clerkId: metadata.userId },
        data: { avatarUrl: file.url },
      });
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  banner: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.user.update({
        where: { clerkId: metadata.userId },
        data: { bannerUrl: file.url },
      });
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
