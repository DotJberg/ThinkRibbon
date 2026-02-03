import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface EditPostModalProps {
	isOpen: boolean;
	onClose: () => void;
	postId: string;
	currentContent: string;
}

export function EditPostModal({
	isOpen,
	onClose,
	postId,
	currentContent,
}: EditPostModalProps) {
	const { user } = useUser();
	const [content, setContent] = useState(currentContent);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const updatePost = useMutation(api.posts.updatePost);

	const maxLength = 280;
	const remaining = maxLength - content.length;
	const isOverLimit = remaining < 0;

	useEffect(() => {
		if (isOpen) {
			setContent(currentContent);
		}
	}, [isOpen, currentContent]);

	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleSubmit = async () => {
		if (!user || !content.trim() || isOverLimit || isSubmitting) return;

		setIsSubmitting(true);
		try {
			await updatePost({
				postId: postId as Id<"posts">,
				content: content.trim(),
				clerkId: user.id,
			});
			onClose();
		} catch (error) {
			console.error("Failed to update post:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect */}
			<div
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full mx-4 shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-700/50">
					<h3 className="text-lg font-bold text-white">Edit Post</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1 text-gray-400 hover:text-white transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-4">
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						rows={5}
						className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-lg"
						placeholder="What's on your mind?"
					/>
					<div className="flex justify-end mt-2">
						<span
							className={`text-sm ${isOverLimit ? "text-red-400" : remaining < 20 ? "text-yellow-400" : "text-gray-500"}`}
						>
							{remaining}
						</span>
					</div>
				</div>

				{/* Footer */}
				<div className="flex gap-3 p-4 border-t border-gray-700/50">
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={
							isSubmitting ||
							!content.trim() ||
							isOverLimit ||
							content.trim() === currentContent.trim()
						}
						className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{isSubmitting ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Saving...
							</>
						) : (
							"Save Changes"
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
