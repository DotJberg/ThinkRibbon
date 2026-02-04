"use client";

import { AlertCircle, Image as ImageIcon, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useImageResize } from "@/hooks/useImageResize";
import { IMAGE_CONSTRAINTS } from "@/lib/image-utils";
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
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { processFile, error, resizeInfo, clearError, clearResizeInfo } =
		useImageResize({
			maxWidth: IMAGE_CONSTRAINTS.cover.maxWidth,
			maxHeight: IMAGE_CONSTRAINTS.cover.maxHeight,
			maxBytes: 4 * 1024 * 1024, // 4MB
			maxFileSizeLabel: "4MB",
		});

	const { startUpload } = useUploadThing(uploadEndpoint, {
		onClientUploadComplete: (res) => {
			if (res?.[0]) {
				const { url, fileKey } = res[0].serverData;
				onUpload(url, fileKey || "");
				clearResizeInfo();
			}
			setIsUploading(false);
		},
		onUploadError: () => {
			setIsUploading(false);
		},
	});

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const processedFile = await processFile(file);
			if (!processedFile) return;

			// Proceed with upload
			setIsUploading(true);
			try {
				await startUpload([processedFile]);
			} catch {
				setIsUploading(false);
			}
		},
		[processFile, startUpload],
	);

	const handleRemove = useCallback(() => {
		onRemove();
		clearError();
		clearResizeInfo();
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [onRemove, clearError, clearResizeInfo]);

	const handleImageError = (
		e: React.SyntheticEvent<HTMLImageElement, Event>,
	) => {
		e.currentTarget.style.display = "none";
	};

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
							crossOrigin="anonymous"
							onError={handleImageError}
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
