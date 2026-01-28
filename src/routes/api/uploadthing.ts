import { createRouteHandler } from "uploadthing/h3";
import { uploadRouter } from "@/lib/server/uploadthing";

const handler = createRouteHandler({
	router: uploadRouter,
	config: {
		token: process.env.UPLOADTHING_TOKEN,
	},
});

export const POST = handler;
export const GET = handler;
