import { v } from "convex/values";
import { action } from "./_generated/server";

function extractFileKey(url: string): string | null {
	const match = url.match(/\/f\/([^/?]+)/);
	return match?.[1] || null;
}

async function deleteUploadThingFiles(urls: string[]): Promise<void> {
	const fileKeys = urls
		.filter((url) => url.includes("ufs.sh") || url.includes("utfs.io"))
		.map((url) => extractFileKey(url))
		.filter((key): key is string => key !== null);

	if (fileKeys.length === 0) return;

	const token = process.env.UPLOADTHING_TOKEN;
	if (!token) return;

	try {
		// Use UploadThing API directly
		const response = await fetch("https://api.uploadthing.com/v6/deleteFiles", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Uploadthing-Api-Key": token,
			},
			body: JSON.stringify({ fileKeys }),
		});

		if (!response.ok) {
			console.error("Failed to delete UploadThing files:", response.statusText);
		}
	} catch (err) {
		console.error("Error deleting UploadThing files:", err);
	}
}

export const deleteFiles = action({
	args: { urls: v.array(v.string()) },
	handler: async (_ctx, args) => {
		await deleteUploadThingFiles(args.urls);
		return { success: true, deletedCount: args.urls.length };
	},
});
