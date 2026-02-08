import { createFileRoute } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/api/cron/cleanup-uploads")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				// Verify the request is from Vercel Cron
				const authHeader = request.headers.get("Authorization");
				const cronSecret = process.env.CRON_SECRET;

				if (
					process.env.NODE_ENV === "production" &&
					cronSecret &&
					authHeader !== `Bearer ${cronSecret}`
				) {
					return new Response("Unauthorized", { status: 401 });
				}

				const convexUrl = process.env.VITE_CONVEX_URL;
				if (!convexUrl) {
					return new Response("VITE_CONVEX_URL not configured", {
						status: 500,
					});
				}

				const client = new ConvexHttpClient(convexUrl);

				try {
					await client.action(api.cleanup.run, {});
					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("UploadThing cleanup error:", error);
					return new Response(
						`Cleanup error: ${error instanceof Error ? error.message : "Unknown error"}`,
						{ status: 500 },
					);
				}
			},
		},
	},
});
