// Shared date utility functions for consistent formatting across the app

/**
 * Get a consistent month-year key for grouping (e.g., "2024-03")
 * Uses UTC to match server-side grouping
 */
export function getMonthYearKey(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Format a date to display month and year (e.g., "March 2024")
 */
export function formatMonthYear(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

/**
 * Format month and year from numeric values (e.g., "March 2024")
 */
export function formatMonthYearFromNumbers(
	year: number,
	month: number,
): string {
	const date = new Date(Date.UTC(year, month - 1, 1));
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

/**
 * Parse a month parameter string (e.g., "2024-03") into year and month numbers
 */
export function parseMonthParam(
	month: string,
): { year: number; month: number } | null {
	const match = month.match(/^(\d{4})-(\d{2})$/);
	if (!match) return null;
	return {
		year: parseInt(match[1], 10),
		month: parseInt(match[2], 10),
	};
}

/**
 * Format a countdown from now until a release date
 */
export function formatCountdown(releaseDate: Date): string {
	const now = new Date();
	const diff = releaseDate.getTime() - now.getTime();

	if (diff <= 0) return "Released!";

	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

	if (days > 30) {
		const months = Math.floor(days / 30);
		const remainingDays = days % 30;
		if (remainingDays > 0) {
			return `${months}mo ${remainingDays}d`;
		}
		return `${months} month${months > 1 ? "s" : ""}`;
	}

	if (days > 0) {
		return `${days}d ${hours}h`;
	}

	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	return `${hours}h ${minutes}m`;
}

/**
 * Format a release date for display (e.g., "Mar 15, 2024")
 */
export function formatReleaseDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
