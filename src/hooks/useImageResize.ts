import { useCallback, useState } from "react";
import { resizeImageToFit } from "@/lib/image-utils";

export interface ImageConstraints {
	maxWidth: number;
	maxHeight: number;
	maxBytes: number;
	maxFileSizeLabel: string;
}

export interface UseImageResizeResult {
	processFile: (file: File) => Promise<File | null>;
	error: string | null;
	resizeInfo: string | null;
	clearError: () => void;
	clearResizeInfo: () => void;
}

/**
 * Hook to handle image validation and resizing before upload
 */
export function useImageResize(
	constraints: ImageConstraints,
): UseImageResizeResult {
	const [error, setError] = useState<string | null>(null);
	const [resizeInfo, setResizeInfo] = useState<string | null>(null);

	const clearError = useCallback(() => setError(null), []);
	const clearResizeInfo = useCallback(() => setResizeInfo(null), []);

	const processFile = useCallback(
		async (file: File): Promise<File | null> => {
			setError(null);
			setResizeInfo(null);

			// Check file type
			if (!file.type.startsWith("image/")) {
				setError("Please select an image file");
				return null;
			}

			try {
				// Resize image if needed
				const resizedFile = await resizeImageToFit(
					file,
					constraints.maxWidth,
					constraints.maxHeight,
				);

				// Check if resize happened
				if (resizedFile !== file) {
					setResizeInfo(
						`Image was resized to fit within ${constraints.maxWidth}x${constraints.maxHeight}`,
					);
				}

				// Check final file size after resize
				if (resizedFile.size > constraints.maxBytes) {
					const sizeMB = (resizedFile.size / 1024 / 1024).toFixed(1);
					setError(
						`File size (${sizeMB}MB) exceeds ${constraints.maxFileSizeLabel} limit even after resizing. Try a smaller image.`,
					);
					return null;
				}

				return resizedFile;
			} catch (err) {
				setError((err as Error).message || "Failed to process image");
				return null;
			}
		},
		[constraints],
	);

	return {
		processFile,
		error,
		resizeInfo,
		clearError,
		clearResizeInfo,
	};
}
