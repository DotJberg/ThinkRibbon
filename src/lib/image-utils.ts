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

export const POST_IMAGE_CONSTRAINTS = {
	maxLongestSide: 1600,
	maxCount: 4,
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

// Resize an image file on the client if its longest side exceeds maxPx.
// Returns the original file unchanged if no resize is needed.
export function resizeImageIfNeeded(file: File, maxPx = 1600): Promise<File> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			const { width, height } = img;
			if (width <= maxPx && height <= maxPx) {
				resolve(file);
				return;
			}

			const scale = maxPx / Math.max(width, height);
			const targetW = Math.round(width * scale);
			const targetH = Math.round(height * scale);

			const canvas = document.createElement("canvas");
			canvas.width = targetW;
			canvas.height = targetH;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				resolve(file);
				return;
			}

			ctx.drawImage(img, 0, 0, targetW, targetH);

			const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
			const quality = outputType === "image/jpeg" ? 0.85 : undefined;

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						resolve(file);
						return;
					}
					resolve(new File([blob], file.name, { type: outputType }));
				},
				outputType,
				quality,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image for resizing"));
		};

		img.src = url;
	});
}
