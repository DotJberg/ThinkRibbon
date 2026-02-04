import { createFileRoute } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/api/cron/cleanup")({
	server: {
		handlers: {
			GET: async ({ request }) => {
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
				const results: Record<string, unknown> = {};

				try {
					// Cleanup orphaned games (cached >14 days, not referenced anywhere)
					const gameCleanup = await client.mutation(
						api.games.cleanupOrphanedGames,
						{
							maxAgeDays: 14,
							dryRun: false,
						},
					);
					results.games = gameCleanup;
					console.log("Game cleanup completed:", gameCleanup);

					// Add other cleanup tasks here in the future
					// e.g., orphaned images, expired drafts, etc.

					return new Response(JSON.stringify(results), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Cleanup error:", error);
					return new Response(
						`Cleanup error: ${error instanceof Error ? error.message : "Unknown error"}`,
						{ status: 500 },
					);
				}
			},
		},
	},
});
