type IgdbImageSize =
	| "micro" // 35x35
	| "thumb" // 90x90
	| "cover_small" // 90x128
	| "cover_big" // 264x374
	| "screenshot_med" // 569x320
	| "screenshot_big" // 889x500
	| "screenshot_huge" // 1280x720
	| "720p" // 1280x720
	| "1080p"; // 1920x1080

export function buildIgdbImageUrl(
	imageId: string,
	size: IgdbImageSize = "screenshot_big",
): string {
	return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}
