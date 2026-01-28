import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Heart, Reply, Send } from "lucide-react";
import { useState } from "react";
import { createComment } from "../../lib/server/comments";
import { toggleCommentLike } from "../../lib/server/likes";

interface CommentItemProps {
	// biome-ignore lint/suspicious/noExplicitAny: Complex nested comment type
	comment: any;
	depth?: number;
	onReplySuccess?: () => void;
	postId?: string;
	articleId?: string;
	reviewId?: string;
}

export function CommentItem({
	comment,
	depth = 0,
	onReplySuccess,
	postId,
	articleId,
	reviewId,
}: CommentItemProps) {
	const { user, isSignedIn } = useUser();
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [replyText, setReplyText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Local state for optimistic updates
	const [hasLiked, setHasLiked] = useState(comment.likes?.length > 0);
	const [likeCount, setLikeCount] = useState(comment._count.likes);
	const [isLiking, setIsLiking] = useState(false);

	const handleLike = async () => {
		if (!isSignedIn || isLiking || !user) return;
		setIsLiking(true);

		// Optimistic
		const prevLiked = hasLiked;
		setHasLiked(!prevLiked);
		setLikeCount(prevLiked ? likeCount - 1 : likeCount + 1);

		try {
			await toggleCommentLike({
				data: { commentId: comment.id, clerkId: user.id },
			});
		} catch (_error) {
			// Revert
			setHasLiked(prevLiked);
			setLikeCount(prevLiked ? likeCount : likeCount); // simplistic revert
		} finally {
			setIsLiking(false);
		}
	};

	const handleReply = async () => {
		if (!replyText.trim() || !user) return;
		setIsSubmitting(true);
		try {
			await createComment({
				data: {
					content: replyText,
					authorClerkId: user.id,
					postId,
					articleId,
					reviewId,
					parentId: comment.id,
				},
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

	return (
		<div className={`flex gap-3 ${depth > 0 ? "ml-8 mt-4" : "mt-6"}`}>
			<Link
				to="/profile/$username"
				params={{ username: comment.author.username }}
				className="flex-shrink-0"
			>
				<div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
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
							className="text-sm font-semibold text-white hover:text-purple-400"
						>
							{comment.author.displayName || comment.author.username}
						</Link>
						<span className="text-xs text-gray-500">
							{formatDistanceToNow(new Date(comment.createdAt))} ago
						</span>
					</div>
					<p className="text-sm text-gray-300 whitespace-pre-wrap">
						{comment.content}
					</p>
				</div>

				<div className="flex items-center gap-4 mt-1 ml-1">
					<button
						type="button"
						onClick={handleLike}
						disabled={!isSignedIn}
						className={`flex items-center gap-1 text-xs transition-colors ${hasLiked ? "text-pink-500" : "text-gray-500 hover:text-pink-400"}`}
					>
						<Heart size={12} className={hasLiked ? "fill-current" : ""} />
						{likeCount > 0 && <span>{likeCount}</span>}
						<span className="sr-only">Like</span>
					</button>
					<button
						type="button"
						onClick={() => setShowReplyInput(!showReplyInput)}
						className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-400 transition-colors"
					>
						<Reply size={12} />
						Reply
					</button>
				</div>

				{/* Reply Input */}
				{showReplyInput && (
					<div className="mt-2 flex gap-2">
						<input
							type="text"
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
							placeholder="Write a reply..."
						/>
						<button
							type="button"
							onClick={handleReply}
							disabled={!replyText.trim() || isSubmitting}
							className="p-1.5 bg-purple-600 rounded-lg text-white disabled:opacity-50"
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
								key={reply.id}
								comment={reply}
								depth={depth + 1}
								onReplySuccess={onReplySuccess}
								postId={postId}
								articleId={articleId}
								reviewId={reviewId}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
