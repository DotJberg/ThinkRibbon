import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Reply, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../convex/_generated/api";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { LikersModal } from "./LikersModal";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { PixelHeart } from "./PixelHeart";

interface CommentItemProps {
	// biome-ignore lint/suspicious/noExplicitAny: Complex nested comment type
	comment: any;
	depth?: number;
	onReplySuccess?: () => void;
	targetType: "post" | "article" | "review";
	targetId: string;
}

export function CommentItem({
	comment,
	depth = 0,
	onReplySuccess,
	targetType,
	targetId,
}: CommentItemProps) {
	const { user, isSignedIn } = useUser();
	const toggleLike = useMutation(api.likes.toggle);
	const createCommentMut = useMutation(api.comments.create);
	const deleteCommentMut = useMutation(api.comments.deleteComment);
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [replyText, setReplyText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Local state for optimistic updates
	const [hasLiked, setHasLiked] = useState(
		comment.hasLiked ?? comment.likes?.length > 0,
	);
	const [likeCount, setLikeCount] = useState(comment._count?.likes ?? 0);
	const [isLiking, setIsLiking] = useState(false);
	const [showLikersModal, setShowLikersModal] = useState(false);

	const commentId = comment._id || comment.id;

	const handleLike = async () => {
		if (!isSignedIn || isLiking || !user) return;
		setIsLiking(true);

		const prevLiked = hasLiked;
		setHasLiked(!prevLiked);
		setLikeCount(prevLiked ? likeCount - 1 : likeCount + 1);

		try {
			await toggleLike({
				clerkId: user.id,
				targetType: "comment",
				targetId: commentId,
			});
		} catch (_error) {
			setHasLiked(prevLiked);
			setLikeCount(prevLiked ? likeCount : likeCount);
		} finally {
			setIsLiking(false);
		}
	};

	const handleReply = async () => {
		if (!replyText.trim() || !user) return;
		setIsSubmitting(true);
		try {
			await createCommentMut({
				content: replyText,
				authorClerkId: user.id,
				targetType,
				targetId,
				parentId: commentId,
			});
			setReplyText("");
			setShowReplyInput(false);
			onReplySuccess?.();
		} catch (error) {
			console.error("Failed to reply:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!user || isDeleting) return;
		setIsDeleting(true);
		try {
			await deleteCommentMut({
				commentId,
				clerkId: user.id,
			});
		} catch (error) {
			console.error("Failed to delete comment:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	const isAdmin = useQuery(
		api.users.isAdmin,
		user?.id ? { clerkId: user.id } : "skip",
	);
	const isAuthor = user && comment.author?.clerkId === user.id;
	const canDelete = isAuthor || isAdmin;

	// Render deleted placeholder
	if (comment.deleted) {
		return (
			<div
				id={`comment-${commentId}`}
				className={`flex gap-3 ${depth > 0 ? "ml-4 sm:ml-8 mt-4" : "mt-6"}`}
			>
				<div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
				<div className="flex-1 min-w-0">
					<div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/30">
						<p className="text-sm text-gray-500 italic">
							This comment was deleted.
						</p>
					</div>

					{/* Nested Replies */}
					{comment.replies && comment.replies.length > 0 && (
						<div className="mt-2">
							{/* biome-ignore lint/suspicious/noExplicitAny: Complex nested reply type */}
							{comment.replies.map((reply: any) => (
								<CommentItem
									key={reply._id || reply.id}
									comment={reply}
									depth={depth + 1}
									onReplySuccess={onReplySuccess}
									targetType={targetType}
									targetId={targetId}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			id={`comment-${commentId}`}
			className={`flex gap-3 ${depth > 0 ? "ml-4 sm:ml-8 mt-4" : "mt-6"}`}
		>
			<Link
				to="/profile/$username"
				params={{ username: comment.author.username }}
				className="flex-shrink-0"
			>
				<div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden">
					{comment.author.avatarUrl ? (
						<img
							src={comment.author.avatarUrl}
							alt=""
							className="w-full h-full object-cover"
						/>
					) : (
						<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
							{(comment.author.displayName ||
								comment.author.username)[0].toUpperCase()}
						</span>
					)}
				</div>
			</Link>

			<div className="flex-1 min-w-0">
				<div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
					<div className="flex items-center gap-2 mb-1">
						<Link
							to="/profile/$username"
							params={{ username: comment.author.username }}
							className="text-sm font-semibold text-white hover:text-slate-400"
						>
							{comment.author.displayName || comment.author.username}
						</Link>
						<span className="text-xs text-gray-500">
							{formatDistanceToNow(new Date(comment._creationTime))} ago
						</span>
					</div>
					<p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
						{comment.content}
					</p>
					{comment.linkPreview && (
						<div className="mt-2">
							<LinkPreviewCard
								url={comment.linkPreview.url}
								title={comment.linkPreview.title}
								description={comment.linkPreview.description}
								imageUrl={comment.linkPreview.imageUrl}
								siteName={comment.linkPreview.siteName}
								domain={comment.linkPreview.domain}
							/>
						</div>
					)}
				</div>

				<div className="flex items-center gap-4 mt-1 ml-1">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleLike}
							disabled={!isSignedIn}
							className={`flex items-center transition-colors ${hasLiked ? "text-red-500 hover:text-red-400" : "text-gray-500 hover:text-red-400"}`}
						>
							<PixelHeart size={12} filled={hasLiked} />
							<span className="sr-only">Like</span>
						</button>
						{likeCount > 0 && (
							<button
								type="button"
								onClick={() => setShowLikersModal(true)}
								className={`text-xs hover:underline ${hasLiked ? "text-red-500" : "text-gray-500"}`}
							>
								{likeCount}
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={() => setShowReplyInput(!showReplyInput)}
						className="flex items-center gap-1 text-xs text-gray-500 hover:text-slate-400 transition-colors"
					>
						<Reply size={12} />
						Reply
					</button>
					{canDelete && (
						<button
							type="button"
							onClick={handleDelete}
							disabled={isDeleting}
							className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
						>
							<Trash2 size={12} />
							Delete
						</button>
					)}
				</div>

				{/* Reply Input */}
				{showReplyInput && (
					<div className="mt-2 flex gap-2 min-w-0">
						<input
							type="text"
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							className="flex-1 min-w-0 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-500"
							placeholder="Write a reply..."
						/>
						<EmojiPickerButton
							size={14}
							onEmojiSelect={(emoji) => setReplyText((prev) => prev + emoji)}
						/>
						<button
							type="button"
							onClick={handleReply}
							disabled={!replyText.trim() || isSubmitting}
							className="p-1.5 bg-slate-700 rounded-lg text-white disabled:opacity-50"
						>
							<Send size={14} />
						</button>
					</div>
				)}

				{/* Nested Replies */}
				{comment.replies && comment.replies.length > 0 && (
					<div className="mt-2">
						{/* biome-ignore lint/suspicious/noExplicitAny: Complex nested reply type */}
						{comment.replies.map((reply: any) => (
							<CommentItem
								key={reply._id || reply.id}
								comment={reply}
								depth={depth + 1}
								onReplySuccess={onReplySuccess}
								targetType={targetType}
								targetId={targetId}
							/>
						))}
					</div>
				)}
			</div>

			{showLikersModal &&
				createPortal(
					<LikersModal
						isOpen={showLikersModal}
						onClose={() => setShowLikersModal(false)}
						targetType="comment"
						targetId={commentId}
					/>,
					document.body,
				)}
		</div>
	);
}
