import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMentionAutocomplete } from "../../hooks/useMentionAutocomplete";
import { stripFirstUrl } from "../../lib/link-preview";
import type { MentionData } from "../../lib/mentions";
import { MentionDropdown, type MentionDropdownRef } from "./MentionDropdown";
import { MentionHighlightOverlay } from "./MentionHighlightOverlay";

function mentionsEqual(
	a: MentionData[] | undefined,
	b: MentionData[],
): boolean {
	const prev = a ?? [];
	if (prev.length !== b.length) return false;
	const keys = new Set(prev.map((m) => `${m.type}:${m.id}`));
	return b.every((m) => keys.has(`${m.type}:${m.id}`));
}

interface EditPostModalProps {
	isOpen: boolean;
	onClose: () => void;
	postId: string;
	currentContent: string;
	hasLinkPreview?: boolean;
	currentMentions?: MentionData[];
}

export function EditPostModal({
	isOpen,
	onClose,
	postId,
	currentContent,
	hasLinkPreview,
	currentMentions,
}: EditPostModalProps) {
	const { user } = useUser();
	const [content, setContent] = useState(currentContent);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const updatePost = useMutation(api.posts.updatePost);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const mentionDropdownRef = useRef<MentionDropdownRef>(null);
	const mention = useMentionAutocomplete();

	const maxLength = 280;
	const effectiveLength = hasLinkPreview
		? stripFirstUrl(content).length
		: content.length;
	const remaining = maxLength - effectiveLength;
	const isOverLimit = remaining < 0;

	useEffect(() => {
		if (isOpen) {
			setContent(currentContent);
			mention.clearMentions();
			if (currentMentions) {
				for (const m of currentMentions) {
					mention.seedMention(m);
				}
			}
		}
	}, [
		isOpen,
		currentContent,
		currentMentions,
		mention.clearMentions,
		mention.seedMention,
	]);

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
				mentions: mention.mentions.length > 0 ? mention.mentions : undefined,
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
					<div className="relative">
						<MentionHighlightOverlay
							content={content}
							mentions={mention.mentions}
							textareaRef={textareaRef}
							className="bg-gray-800/50 border border-transparent rounded-lg p-4 text-lg"
						/>
						<textarea
							ref={textareaRef}
							value={content}
							onChange={(e) => {
								setContent(e.target.value);
								mention.detectTrigger(
									e.target.value,
									e.target.selectionStart ?? 0,
								);
							}}
							onKeyDown={(e) => {
								if (!mention.isOpen) return;
								if (mentionDropdownRef.current?.handleKeyDown(e)) {
									e.preventDefault();
									return;
								}
								if (e.key === "Escape") {
									e.preventDefault();
									e.stopPropagation();
									mention.close();
								}
							}}
							rows={5}
							className="relative w-full bg-transparent border border-gray-700 rounded-lg p-4 text-transparent caret-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all text-lg"
							placeholder="What's on your mind?"
						/>
						{mention.isOpen && mention.triggerType && (
							<MentionDropdown
								ref={mentionDropdownRef}
								triggerType={mention.triggerType}
								query={mention.query}
								selectedIndex={mention.selectedIndex}
								onSelect={(item) => {
									mention.selectItem(item, content, setContent);
								}}
								onSetSelectedIndex={mention.setSelectedIndex}
							/>
						)}
					</div>
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
							(content.trim() === currentContent.trim() &&
								mentionsEqual(currentMentions, mention.mentions))
						}
						className="flex-1 py-2.5 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
