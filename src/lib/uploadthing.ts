import { generateReactHelpers, generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/server/uploadthing";

export const UploadButton = generateUploadButton<OurFileRouter>();

export const { useUploadThing, uploadFiles } =
	generateReactHelpers<OurFileRouter>();
