// Client-safe image utilities (no server dependencies)

// Image dimension constraints
export const IMAGE_CONSTRAINTS = {
	cover: {
		maxWidth: 1920,
		maxHeight: 1080,
		maxFileSize: "4MB" as const,
	},
	inline: {
		maxWidth: 1600,
		maxHeight: 1600,
		maxFileSize: "2MB" as const,
	},
};

// Validate image dimensions on client before upload
export function validateImageDimensions(
	width: number,
	height: number,
	type: "cover" | "inline",
): {
	valid: boolean;
	needsResize: boolean;
	targetWidth?: number;
	targetHeight?: number;
	message?: string;
} {
	const constraints = IMAGE_CONSTRAINTS[type];

	if (width <= constraints.maxWidth && height <= constraints.maxHeight) {
		return { valid: true, needsResize: false };
	}

	// Calculate resize dimensions maintaining aspect ratio
	const aspectRatio = width / height;
	let targetWidth = width;
	let targetHeight = height;

	if (width > constraints.maxWidth) {
		targetWidth = constraints.maxWidth;
		targetHeight = Math.round(targetWidth / aspectRatio);
	}

	if (targetHeight > constraints.maxHeight) {
		targetHeight = constraints.maxHeight;
		targetWidth = Math.round(targetHeight * aspectRatio);
	}

	return {
		valid: true,
		needsResize: true,
		targetWidth,
		targetHeight,
		message: `Image will be resized from ${width}x${height} to ${targetWidth}x${targetHeight}`,
	};
}
