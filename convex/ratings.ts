export const RATING_LABELS: Record<number, string> = {
	0.5: "Unplayable",
	1.0: "Painful",
	1.5: "Bad",
	2.0: "Forgettable",
	2.5: "Mixed",
	3.0: "Decent",
	3.5: "Great",
	4.0: "Excellent",
	4.5: "Amazing",
	5.0: "Masterpiece",
};

export const VALID_RATINGS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

export function isValidRating(n: number): boolean {
	return VALID_RATINGS.includes(n);
}

export function getRatingLabel(n: number): string {
	return RATING_LABELS[n] ?? "";
}
