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
			GET: async ({ request }) => handler(request),
			POST: async ({ request }) => handler(request),
		},
	},
});
