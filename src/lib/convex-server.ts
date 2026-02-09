import { ConvexHttpClient } from "convex/browser";

const convexUrl =
	process.env.VITE_CONVEX_URL || import.meta.env.VITE_CONVEX_URL;

let client: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
	if (!client) {
		if (!convexUrl) {
			throw new Error("VITE_CONVEX_URL is not set");
		}
		client = new ConvexHttpClient(convexUrl as string);
	}
	return client;
}
