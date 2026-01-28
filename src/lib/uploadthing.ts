import { generateReactHelpers, generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/server/uploadthing";

// Configure UploadThing to include credentials (cookies) with requests
export const UploadButton = generateUploadButton<OurFileRouter>({
	url: "/api/uploadthing",
});

export const { useUploadThing, uploadFiles } =
	generateReactHelpers<OurFileRouter>({
		url: "/api/uploadthing",
	});
