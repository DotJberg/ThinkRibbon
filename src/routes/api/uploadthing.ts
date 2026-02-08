import { createFileRoute } from "@tanstack/react-router";
import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "@/lib/server/uploadthing";

const handler = createRouteHandler({
	router: uploadRouter,
	config: {
		token: process.env.UPLOADTHING_TOKEN,
		callbackUrl:
			process.env.UPLOADTHING_CALLBACK_URL ||
			(process.env.NODE_ENV === "production"
				? "https://www.thinkribbon.com/api/uploadthing"
				: undefined),
	},
});

export const Route = createFileRoute("/api/uploadthing")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => handler(request),
			POST: async ({ request }: { request: Request }) => handler(request),
		},
	},
});
