import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily cleanup of expired notifications at 4:30 AM UTC
crons.daily(
	"cleanup expired notifications",
	{ hourUTC: 4, minuteUTC: 30 },
	internal.notifications.cleanup,
);

export default crons;
