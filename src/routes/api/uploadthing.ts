import { createFileRoute } from "@tanstack/react-router";
import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "@/lib/server/uploadthing";

const handler = createRouteHandler({
	router: uploadRouter,
	config: {
		token: process.env.UPLOADTHING_TOKEN,
	},
});

export const Route = createFileRoute("/api/uploadthing")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				console.log("[UploadThing API] GET request");
				return handler(request);
			},
			POST: async ({ request }) => {
				const url = new URL(request.url);
				console.log("[UploadThing API] POST request:", url.pathname);
				// Log if this is a callback (webhook) from UploadThing
				const isCallback = url.searchParams.has("slug");
				if (isCallback) {
					console.log(
						"[UploadThing API] Callback/webhook for:",
						url.searchParams.get("slug"),
					);
				}
				const response = await handler(request);
				console.log("[UploadThing API] POST response status:", response.status);
				return response;
			},
		},
	},
});
