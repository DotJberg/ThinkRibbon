// Client-safe image utilities (no server dependencies)

import type { Area } from "react-easy-crop";

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
	return resizeImageToFit(file, maxPx, maxPx);
}

// Resize an image to fit within maxWidth x maxHeight while maintaining aspect ratio.
// Returns the original file unchanged if no resize is needed.
export function resizeImageToFit(
	file: File,
	maxWidth: number,
	maxHeight: number,
	quality = 0.85,
): Promise<File> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			const { width, height } = img;

			// Check if resize is needed
			if (width <= maxWidth && height <= maxHeight) {
				resolve(file);
				return;
			}

			// Calculate target dimensions maintaining aspect ratio
			const aspectRatio = width / height;
			let targetW = width;
			let targetH = height;

			if (targetW > maxWidth) {
				targetW = maxWidth;
				targetH = Math.round(targetW / aspectRatio);
			}

			if (targetH > maxHeight) {
				targetH = maxHeight;
				targetW = Math.round(targetH * aspectRatio);
			}

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
			const outputQuality = outputType === "image/jpeg" ? quality : undefined;

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						resolve(file);
						return;
					}
					resolve(new File([blob], file.name, { type: outputType }));
				},
				outputType,
				outputQuality,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image for resizing"));
		};

		img.src = url;
	});
}

// Crop an image using the area from react-easy-crop and output a File
export function cropImage(
	imageSrc: string,
	cropArea: Area,
	outputWidth: number,
	outputHeight: number,
	quality = 0.9,
): Promise<File> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = outputWidth;
			canvas.height = outputHeight;
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			// Draw the cropped area onto the canvas
			ctx.drawImage(
				img,
				cropArea.x,
				cropArea.y,
				cropArea.width,
				cropArea.height,
				0,
				0,
				outputWidth,
				outputHeight,
			);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Failed to create blob from canvas"));
						return;
					}
					resolve(
						new File([blob], "cropped-image.jpg", { type: "image/jpeg" }),
					);
				},
				"image/jpeg",
				quality,
			);
		};

		img.onerror = () => {
			reject(new Error("Failed to load image for cropping"));
		};

		img.src = imageSrc;
	});
}
