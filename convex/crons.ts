import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily cleanup of expired notifications at 4:30 AM UTC
crons.daily(
	"cleanup expired notifications",
	{ hourUTC: 4, minuteUTC: 30 },
	internal.notifications.cleanup,
);

// Daily cleanup of orphaned games (cached >14 days, not referenced anywhere)
crons.daily(
	"cleanup orphaned games",
	{ hourUTC: 4, minuteUTC: 0 },
	internal.games.cleanupOrphanedGames,
	{},
);

// Monthly cleanup of orphaned UploadThing files (1st of each month)
crons.monthly(
	"cleanup orphaned uploads",
	{ day: 1, hourUTC: 4, minuteUTC: 0 },
	internal.cleanup.run,
);

export default crons;
