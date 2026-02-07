import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { cleanEmbedPaste, getEmbedInfo } from "../../lib/embed-utils";
import {
	POST_IMAGE_CONSTRAINTS,
	resizeImageIfNeeded,
} from "../../lib/image-utils";
import {
	extractFirstUrl,
	fetchLinkPreview,
	type LinkPreviewData,
	stripFirstUrl,
} from "../../lib/link-preview";
import { useUploadThing } from "../../lib/uploadthing";
import { EmojiPickerButton } from "../shared/EmojiPickerButton";

interface PostComposerProps {
	onSubmit: (
		content: string,
		images: { url: string; fileKey: string }[],
		linkPreview?: LinkPreviewData,
	) => Promise<void>;
	maxLength?: number;
}

export function PostComposer({ onSubmit, maxLength = 280 }: PostComposerProps) {
	const { user } = useUser();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [previews, setPreviews] = useState<string[]>([]);
	const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
	const [isFetchingPreview, setIsFetchingPreview] = useState(false);
	const [lastFetchedUrl, setLastFetchedUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { startUpload, isUploading } = useUploadThing("postImage");

	// Fetch link preview when content contains a URL (debounced)
	const fetchPreview = useCallback(async (url: string) => {
		setIsFetchingPreview(true);
		try {
			const preview = await fetchLinkPreview(url);
			setLinkPreview(preview);
			setLastFetchedUrl(url);
		} catch {
			setLinkPreview(null);
		} finally {
			setIsFetchingPreview(false);
		}
	}, []);

	useEffect(() => {
		// Don't fetch preview if there are images
		if (selectedFiles.length > 0) {
			setLinkPreview(null);
			return;
		}

		const url = extractFirstUrl(content);

		// Clear preview if no URL or URL changed
		if (!url) {
			setLinkPreview(null);
			setLastFetchedUrl(null);
			return;
		}

		// Don't re-fetch if same URL
		if (url === lastFetchedUrl) {
			return;
		}

		// Debounce the fetch
		const timeout = setTimeout(() => {
			fetchPreview(url);
		}, 500);

		return () => clearTimeout(timeout);
	}, [content, selectedFiles.length, lastFetchedUrl, fetchPreview]);

	const dbUser = useQuery(
		api.users.getByClerkId,
		user?.id ? { clerkId: user.id } : "skip",
	);

	const displayAvatarUrl = dbUser?.avatarUrl || user?.imageUrl;

	// Count only non-URL text toward the limit when content has an embed link
	const getTextLength = useCallback(
		(text: string) => {
			const url = extractFirstUrl(text);
			if (linkPreview || (url && getEmbedInfo(url))) {
				return stripFirstUrl(text).length;
			}
			return text.length;
		},
		[linkPreview],
	);

	const effectiveLength = getTextLength(content);
	const remaining = maxLength - effectiveLength;
	const isOverLimit = remaining < 0;
	const isEmpty = content.trim().length === 0 && selectedFiles.length === 0;

	// Clean HTML embed pastes, then cap non-URL text at maxLength
	const handleContentChange = useCallback(
		(value: string) => {
			// Clean HTML embed code (e.g. Twitter blockquote) → extract just the URL
			const cleaned = cleanEmbedPaste(value);

			if (cleaned.length <= content.length) {
				setContent(cleaned);
				return;
			}
			const textLen = getTextLength(cleaned);
			if (textLen <= maxLength) {
				setContent(cleaned);
			} else {
				// Over limit — trim only the non-URL text portion
				const url = extractFirstUrl(cleaned);
				if (url && getEmbedInfo(url)) {
					const urlIdx = cleaned.indexOf(url);
					const before = cleaned.slice(0, urlIdx);
					const after = cleaned.slice(urlIdx + url.length);
					const textOnly = before + after;
					const trimmed = textOnly.slice(0, maxLength);
					const clampedIdx = Math.min(urlIdx, trimmed.length);
					setContent(
						trimmed.slice(0, clampedIdx) + url + trimmed.slice(clampedIdx),
					);
				} else {
					setContent(cleaned.slice(0, maxLength));
				}
			}
		},
		[content.length, getTextLength, maxLength],
	);

	const handleAddFiles = useCallback(
		(files: FileList | null) => {
			if (!files) return;
			const newFiles = Array.from(files).slice(
				0,
				POST_IMAGE_CONSTRAINTS.maxCount - selectedFiles.length,
			);
			if (newFiles.length === 0) return;

			const updated = [...selectedFiles, ...newFiles].slice(
				0,
				POST_IMAGE_CONSTRAINTS.maxCount,
			);
			setSelectedFiles(updated);

			// Generate previews for new files
			for (const file of newFiles) {
				const url = URL.createObjectURL(file);
				setPreviews((prev) =>
					[...prev, url].slice(0, POST_IMAGE_CONSTRAINTS.maxCount),
				);
			}
		},
		[selectedFiles],
	);

	const handleRemoveFile = (index: number) => {
		URL.revokeObjectURL(previews[index]);
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
		setPreviews((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isEmpty || isOverLimit || isSubmitting || isUploading) return;

		setIsSubmitting(true);
		try {
			let uploadedImages: { url: string; fileKey: string }[] = [];

			if (selectedFiles.length > 0) {
				// Resize files before uploading
				const resized = await Promise.all(
					selectedFiles.map((f) =>
						resizeImageIfNeeded(f, POST_IMAGE_CONSTRAINTS.maxLongestSide),
					),
				);

				const result = await startUpload(resized);
				if (result) {
					uploadedImages = result.map((r) => ({
						url: r.ufsUrl || r.url,
						fileKey: r.key,
					}));
				}
			}

			await onSubmit(content, uploadedImages, linkPreview || undefined);
			setContent("");
			// Clean up previews
			for (const url of previews) {
				URL.revokeObjectURL(url);
			}
			setSelectedFiles([]);
			setPreviews([]);
			setLinkPreview(null);
			setLastFetchedUrl(null);
		} catch (error) {
			console.error("Failed to create post:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!user) {
		return (
			<div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center">
				<p className="text-gray-400">Sign in to post</p>
			</div>
		);
	}

	const busy = isSubmitting || isUploading;

	return (
		<form
			onSubmit={handleSubmit}
			className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4"
		>
			<div className="flex gap-3">
				{/* Avatar */}
				<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
					{displayAvatarUrl ? (
						<img
							src={displayAvatarUrl}
							alt={user.username || ""}
							className="w-full h-full object-cover"
						/>
					) : (
						<span className="text-white font-bold text-sm">
							{(user.firstName || user.username || "U")[0].toUpperCase()}
						</span>
					)}
				</div>

				<div className="flex-1">
					<textarea
						value={content}
						onChange={(e) => handleContentChange(e.target.value)}
						placeholder="What's on your mind?"
						rows={3}
						className="w-full bg-transparent text-white placeholder:text-gray-500 resize-none focus:outline-none text-lg"
					/>

					{/* Image previews */}
					{previews.length > 0 && (
						<div className="grid grid-cols-2 gap-2 mt-2">
							{previews.map((url, i) => (
								<div key={url} className="relative group">
									<img
										src={url}
										alt=""
										className="w-full h-24 object-cover rounded-lg"
									/>
									<button
										type="button"
										onClick={() => handleRemoveFile(i)}
										className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<X size={14} />
									</button>
								</div>
							))}
						</div>
					)}

					{/* Link preview */}
					{previews.length === 0 && (isFetchingPreview || linkPreview) && (
						<div className="mt-3 border border-gray-700 rounded-lg overflow-hidden">
							{isFetchingPreview ? (
								<div className="p-4 flex items-center justify-center text-gray-400">
									<Loader2 size={16} className="animate-spin mr-2" />
									<span className="text-sm">Loading preview...</span>
								</div>
							) : linkPreview ? (
								<div className="relative">
									{linkPreview.imageUrl && (
										<div className="aspect-video bg-gray-800 overflow-hidden">
											<img
												src={linkPreview.imageUrl}
												alt={linkPreview.title || "Link preview"}
												className="w-full h-full object-cover"
											/>
										</div>
									)}
									<div className="p-3 bg-gray-800/50">
										<div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
											<ExternalLink size={12} />
											<span>{linkPreview.siteName || linkPreview.domain}</span>
										</div>
										{linkPreview.title && (
											<h4 className="text-sm font-medium text-white line-clamp-2">
												{linkPreview.title}
											</h4>
										)}
										{linkPreview.description && (
											<p className="text-xs text-gray-400 line-clamp-2 mt-1">
												{linkPreview.description}
											</p>
										)}
									</div>
									<button
										type="button"
										onClick={() => {
											setLinkPreview(null);
											setLastFetchedUrl(null);
										}}
										className="absolute top-2 right-2 p-1 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
									>
										<X size={14} />
									</button>
								</div>
							) : null}
						</div>
					)}

					<div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={
									selectedFiles.length >= POST_IMAGE_CONSTRAINTS.maxCount ||
									busy
								}
								className="text-gray-400 hover:text-purple-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
								title="Add images"
							>
								<ImagePlus size={20} />
							</button>
							<EmojiPickerButton
								onEmojiSelect={(emoji) => handleContentChange(content + emoji)}
							/>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								multiple
								className="hidden"
								onChange={(e) => handleAddFiles(e.target.files)}
							/>
							<span
								className={`text-sm ${isOverLimit ? "text-red-400" : remaining < 20 ? "text-yellow-400" : "text-gray-500"}`}
							>
								{remaining}
							</span>
						</div>
						<button
							type="submit"
							disabled={isEmpty || isOverLimit || busy}
							className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-full text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{busy ? "Posting..." : "Post"}
						</button>
					</div>
				</div>
			</div>
		</form>
	);
}
