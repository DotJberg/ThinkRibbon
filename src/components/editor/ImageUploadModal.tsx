"use client";

import {
	AlertCircle,
	Check,
	Image as ImageIcon,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { useImageResize } from "@/hooks/useImageResize";
import { isNativePlatform, pickImageNative } from "@/lib/capacitor";
import { IMAGE_CONSTRAINTS } from "@/lib/image-utils";
import { useUploadThing } from "@/lib/uploadthing";

interface ImageUploadModalProps {
	open: boolean;
	onClose: () => void;
	onInsert: (url: string, fileKey: string, caption?: string) => void;
	uploadEndpoint: "articleInlineImage" | "reviewInlineImage";
}

export function ImageUploadModal({
	open,
	onClose,
	onInsert,
	uploadEndpoint,
}: ImageUploadModalProps) {
	const captionId = useId();
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [caption, setCaption] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [dimensions, setDimensions] = useState<{
		width: number;
		height: number;
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { processFile, error, resizeInfo, clearError, clearResizeInfo } =
		useImageResize({
			maxWidth: IMAGE_CONSTRAINTS.inline.maxWidth,
			maxHeight: IMAGE_CONSTRAINTS.inline.maxHeight,
			maxBytes: 2 * 1024 * 1024, // 2MB
			maxFileSizeLabel: "2MB",
		});

	const { startUpload } = useUploadThing(uploadEndpoint, {
		onClientUploadComplete: (res) => {
			if (res?.[0]) {
				const { url, fileKey } = res[0].serverData;
				onInsert(url, fileKey || "", caption);
				resetState();
			}
		},
		onUploadError: () => {
			setIsUploading(false);
		},
	});

	const resetState = useCallback(() => {
		setFile(null);
		setPreview(null);
		setCaption("");
		clearError();
		clearResizeInfo();
		setDimensions(null);
		setIsUploading(false);
	}, [clearError, clearResizeInfo]);

	const handleClose = useCallback(() => {
		resetState();
		onClose();
	}, [onClose, resetState]);

	const loadFilePreview = useCallback(
		async (selectedFile: File) => {
			const processedFile = await processFile(selectedFile);
			if (!processedFile) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				const dataUrl = event.target?.result as string;
				setPreview(dataUrl);

				const img = new window.Image();
				img.onload = () => {
					setDimensions({ width: img.width, height: img.height });
				};
				img.src = dataUrl;
			};
			reader.readAsDataURL(processedFile);

			setFile(processedFile);
		},
		[processFile],
	);

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFile = e.target.files?.[0];
			if (!selectedFile) return;
			await loadFilePreview(selectedFile);
		},
		[loadFilePreview],
	);

	const handleNativePick = useCallback(async () => {
		const picked = await pickImageNative();
		if (picked) await loadFilePreview(picked);
	}, [loadFilePreview]);

	const handleUpload = useCallback(async () => {
		if (!file) return;

		setIsUploading(true);
		clearError();

		try {
			await startUpload([file]);
		} catch {
			// Error handling is done in onUploadError callback
			setIsUploading(false);
		}
	}, [file, startUpload, clearError]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
			<div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-700">
					<h3 className="text-lg font-semibold text-white flex items-center gap-2">
						<ImageIcon size={20} />
						Insert Image
					</h3>
					<button
						type="button"
						onClick={handleClose}
						className="p-1 text-gray-400 hover:text-white transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-4 space-y-4">
					{/* File Input */}
					{!preview ? (
						<>
							<button
								type="button"
								onClick={
									isNativePlatform()
										? handleNativePick
										: () => fileInputRef.current?.click()
								}
								className="w-full border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
							>
								<Upload className="mx-auto mb-3 text-gray-400" size={40} />
								<p className="text-gray-300 mb-1">Click to upload an image</p>
								<p className="text-sm text-gray-500">
									Max {IMAGE_CONSTRAINTS.inline.maxFileSize}, recommended{" "}
									{IMAGE_CONSTRAINTS.inline.maxWidth}x
									{IMAGE_CONSTRAINTS.inline.maxHeight}
								</p>
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleFileSelect}
								className="hidden"
							/>
						</>
					) : (
						<div className="space-y-3">
							{/* Preview */}
							<div className="relative bg-gray-800 rounded-lg overflow-hidden">
								<img
									src={preview}
									alt="Preview"
									className="max-h-64 mx-auto object-contain"
								/>
								<button
									type="button"
									onClick={resetState}
									className="absolute top-2 right-2 p-1 bg-gray-900/80 rounded-full text-gray-400 hover:text-white"
								>
									<X size={16} />
								</button>
							</div>

							{/* Dimensions info */}
							{dimensions && (
								<p className="text-sm text-gray-400 text-center">
									{dimensions.width} x {dimensions.height} pixels
								</p>
							)}

							{/* Resize warning */}
							{resizeInfo && (
								<div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
									<AlertCircle
										className="text-amber-400 flex-shrink-0 mt-0.5"
										size={18}
									/>
									<p className="text-sm text-amber-200">{resizeInfo}</p>
								</div>
							)}
						</div>
					)}

					{/* Caption */}
					<div>
						<label
							htmlFor={captionId}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Caption / Alt Text (optional)
						</label>
						<input
							id={captionId}
							type="text"
							value={caption}
							onChange={(e) => setCaption(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleUpload();
								}
							}}
							placeholder="Describe the image..."
							className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
						/>
					</div>

					{/* Error */}
					{error && (
						<div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
							<AlertCircle className="text-red-400 flex-shrink-0" size={18} />
							<p className="text-sm text-red-200">{error}</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/50">
					<button
						type="button"
						onClick={handleClose}
						className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleUpload}
						disabled={!file || isUploading}
						className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isUploading ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Uploading...
							</>
						) : (
							<>
								<Check size={18} />
								Insert Image
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
