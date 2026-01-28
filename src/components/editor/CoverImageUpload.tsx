"use client";

import { AlertCircle, Image as ImageIcon, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { IMAGE_CONSTRAINTS, validateImageDimensions } from "@/lib/image-utils";
import { useUploadThing } from "@/lib/uploadthing";

interface CoverImageUploadProps {
	currentUrl?: string | null;
	onUpload: (url: string, fileKey: string) => void;
	onRemove: () => void;
	uploadEndpoint: "articleCover" | "reviewCover";
}

export function CoverImageUpload({
	currentUrl,
	onUpload,
	onRemove,
	uploadEndpoint,
}: CoverImageUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [resizeInfo, setResizeInfo] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { startUpload } = useUploadThing(uploadEndpoint, {
		onClientUploadComplete: (res) => {
			if (res?.[0]) {
				const { url, fileKey } = res[0].serverData;
				onUpload(url, fileKey || "");
				setResizeInfo(null);
			}
			setIsUploading(false);
		},
		onUploadError: (err) => {
			setError(err.message || "Upload failed");
			setIsUploading(false);
		},
	});

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			setError(null);
			setResizeInfo(null);

			// Check file type
			if (!file.type.startsWith("image/")) {
				setError("Please select an image file");
				return;
			}

			// Check file size (4MB for cover images)
			const maxBytes = 4 * 1024 * 1024;
			if (file.size > maxBytes) {
				setError(
					`File size must be less than ${IMAGE_CONSTRAINTS.cover.maxFileSize}`,
				);
				return;
			}

			// Check dimensions
			const dataUrl = await readFileAsDataUrl(file);
			const img = new window.Image();

			img.onload = async () => {
				const { width, height } = img;
				const validation = validateImageDimensions(width, height, "cover");

				if (validation.needsResize && validation.message) {
					setResizeInfo(validation.message);
				}

				// Proceed with upload
				setIsUploading(true);
				try {
					await startUpload([file]);
				} catch {
					setError("Upload failed. Please try again.");
					setIsUploading(false);
				}
			};

			img.src = dataUrl;
		},
		[startUpload],
	);

	const handleRemove = useCallback(() => {
		onRemove();
		setError(null);
		setResizeInfo(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [onRemove]);

	return (
		<div className="space-y-3">
			<span className="block text-sm font-medium text-gray-300">
				Cover Image (optional)
			</span>

			{currentUrl ? (
				<div className="relative group">
					<div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
						<img
							src={currentUrl}
							alt="Cover"
							className="w-full h-full object-cover"
						/>
					</div>
					<button
						type="button"
						onClick={handleRemove}
						className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<X size={16} />
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className={`aspect-video w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
						isUploading
							? "border-purple-500 bg-purple-500/10"
							: "border-gray-600 hover:border-purple-500"
					}`}
				>
					{isUploading ? (
						<>
							<div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2" />
							<p className="text-sm text-gray-300">Uploading...</p>
						</>
					) : (
						<>
							<div className="p-3 bg-gray-800 rounded-full mb-3">
								<ImageIcon className="text-gray-400" size={24} />
							</div>
							<p className="text-gray-300 mb-1">Click to upload cover image</p>
							<p className="text-xs text-gray-500">
								Max {IMAGE_CONSTRAINTS.cover.maxFileSize}, recommended{" "}
								{IMAGE_CONSTRAINTS.cover.maxWidth}x
								{IMAGE_CONSTRAINTS.cover.maxHeight}
							</p>
						</>
					)}
				</button>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileSelect}
				className="hidden"
			/>

			{/* Resize info */}
			{resizeInfo && (
				<div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
					<AlertCircle
						className="text-amber-400 flex-shrink-0 mt-0.5"
						size={16}
					/>
					<p className="text-sm text-amber-200">{resizeInfo}</p>
				</div>
			)}

			{/* Error */}
			{error && (
				<div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
					<AlertCircle className="text-red-400 flex-shrink-0" size={16} />
					<p className="text-sm text-red-200">{error}</p>
				</div>
			)}
		</div>
	);
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target?.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}
