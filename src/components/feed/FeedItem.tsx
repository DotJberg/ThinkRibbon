import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import {
	FileText,
	Gamepad2,
	Heart,
	MessageCircle,
	Reply,
	Send,
	Star,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { createComment } from "../../lib/server/comments";
import type { FeedItem } from "../../lib/server/feed";
import {
	toggleArticleLike,
	toggleCommentLike,
	togglePostLike,
	toggleReviewLike,
} from "../../lib/server/likes";

function formatDistanceToNow(date: Date): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return "just now";
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) return `${diffInHours}h ago`;
	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) return `${diffInDays}d ago`;
	return date.toLocaleDateString();
}

interface FeedItemCardProps {
	item: FeedItem;
	onCommentAdded?: () => void;
}

export function FeedItemCard({ item, onCommentAdded }: FeedItemCardProps) {
	const { user, isSignedIn } = useUser();
	const [showCommentInput, setShowCommentInput] = useState(false);
	const [commentText, setCommentText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [localTopComment, setLocalTopComment] = useState(item.topComment);
	const [localCommentCount, setLocalCommentCount] = useState(item.commentCount);
	const [localLikeCount, setLocalLikeCount] = useState(item.likeCount);
	const [hasLiked, setHasLiked] = useState(item.hasLiked ?? false);
	const [isLiking, setIsLiking] = useState(false);
	const [commentLikeCount, setCommentLikeCount] = useState(
		item.topComment?.likeCount ?? 0,
	);
	const [hasLikedComment, setHasLikedComment] = useState(
		item.topComment?.hasLiked ?? false,
	);
	const [isLikingComment, setIsLikingComment] = useState(false);

	const typeConfig = {
		post: {
			icon: TrendingUp,
			color: "purple",
			label: "Post",
			link: null,
		},
		review: {
			icon: Star,
			color: "yellow",
			label: "Review",
			link: `/reviews/${item.id}`,
		},
		article: {
			icon: FileText,
			color: "blue",
			label: "Article",
			link: `/articles/${item.id}`,
		},
	};

	const config = typeConfig[item.type];
	const Icon = config.icon;

	const handleCommentLike = async (commentId: string) => {
		if (!isSignedIn || !user || isLikingComment) return;

		setIsLikingComment(true);
		const previousHasLiked = hasLikedComment;
		const previousCount = commentLikeCount;

		// Optimistic update
		setHasLikedComment(!previousHasLiked);
		setCommentLikeCount(
			previousHasLiked ? previousCount - 1 : previousCount + 1,
		);

		try {
			const result = await toggleCommentLike({
				data: { clerkId: user.id, commentId },
			});
			if (typeof result.liked === "boolean") {
				setHasLikedComment(result.liked);
				// If server returned different state, adjust count accordingly
				if (result.liked !== !previousHasLiked) {
					setCommentLikeCount(result.liked ? previousCount + 1 : previousCount);
				}
			}
		} catch (error) {
			console.error("Error liking comment:", error);
			setHasLikedComment(previousHasLiked);
			setCommentLikeCount(previousCount);
		} finally {
			setIsLikingComment(false);
		}
	};

	const handleToggleLike = async (e: React.MouseEvent) => {
		e.preventDefault();
		if (!user || isLiking) return;

		setIsLiking(true);
		try {
			let result: { liked: boolean } | undefined;
			if (item.type === "post") {
				result = await togglePostLike({
					data: { clerkId: user.id, postId: item.id },
				});
			} else if (item.type === "article") {
				result = await toggleArticleLike({
					data: { clerkId: user.id, articleId: item.id },
				});
			} else {
				result = await toggleReviewLike({
					data: { clerkId: user.id, reviewId: item.id },
				});
			}
			setHasLiked(result.liked);
			setLocalLikeCount((prev) => (result.liked ? prev + 1 : prev - 1));
		} catch (error) {
			console.error("Failed to toggle like:", error);
		} finally {
			setIsLiking(false);
		}
	};

	const handleSubmitComment = async () => {
		if (!commentText.trim() || !user) return;
		setIsSubmitting(true);
		try {
			const newComment = await createComment({
				data: {
					content: commentText.trim(),
					authorClerkId: user.id,
					postId: item.type === "post" ? item.id : undefined,
					articleId: item.type === "article" ? item.id : undefined,
					reviewId: item.type === "review" ? item.id : undefined,
				},
			});

			setLocalTopComment({
				id: newComment.id,
				content: newComment.content,
				createdAt: newComment.createdAt,
				likeCount: 0,
				hasLiked: false,
				author: {
					id: newComment.author.id,
					username: newComment.author.username,
					displayName: newComment.author.displayName,
					avatarUrl: newComment.author.avatarUrl,
				},
			});
			setLocalCommentCount((prev) => prev + 1);
			setCommentText("");
			setShowCommentInput(false);
			onCommentAdded?.();
		} catch (error) {
			console.error("Failed to add comment:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors">
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<Link
						to="/profile/$username"
						params={{ username: item.author.username }}
						className="flex-shrink-0"
					>
						<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
							{item.author.avatarUrl ? (
								<img
									src={item.author.avatarUrl}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="w-full h-full flex items-center justify-center text-white font-bold">
									{(item.author.displayName ||
										item.author.username)[0].toUpperCase()}
								</span>
							)}
						</div>
					</Link>
					<div>
						<Link
							to="/profile/$username"
							params={{ username: item.author.username }}
							className="font-medium text-white hover:text-purple-400 transition-colors"
						>
							{item.author.displayName || item.author.username}
						</Link>
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<span>@{item.author.username}</span>
							<span>·</span>
							<span>{formatDistanceToNow(new Date(item.createdAt))}</span>
						</div>
					</div>
				</div>

				{/* Type Badge */}
				<span
					className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
						item.type === "post"
							? "bg-purple-500/20 text-purple-300"
							: item.type === "review"
								? "bg-yellow-500/20 text-yellow-300"
								: "bg-blue-500/20 text-blue-300"
					}`}
				>
					<Icon size={12} />
					{config.label}
				</span>
			</div>

			{/* Title (for articles and reviews) */}
			{item.title && (
				<h3 className="text-lg font-semibold text-white mb-2">
					{config.link ? (
						<Link
							to={config.link}
							className="hover:text-purple-400 transition-colors"
						>
							{item.title}
						</Link>
					) : (
						item.title
					)}
				</h3>
			)}

			{/* Rating (for reviews) */}
			{item.type === "review" && item.rating && (
				<div className="flex items-center gap-1 mb-2">
					{[1, 2, 3, 4, 5].map((star) => (
						<Star
							key={star}
							size={16}
							className={
								star <= (item.rating || 0)
									? "text-yellow-400 fill-yellow-400"
									: "text-gray-600"
							}
						/>
					))}
				</div>
			)}

			{/* Game (for reviews) */}
			{item.type === "review" && item.game && (
				<Link
					to="/games/$slug"
					params={{ slug: item.game.slug }}
					className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors w-fit"
				>
					{item.game.coverUrl ? (
						<img
							src={item.game.coverUrl}
							alt=""
							className="w-6 h-8 rounded object-cover"
						/>
					) : (
						<Gamepad2 size={16} className="text-gray-400" />
					)}
					<span className="text-sm text-gray-300">{item.game.name}</span>
				</Link>
			)}

			{/* Games (for articles) */}
			{item.type === "article" && item.games && item.games.length > 0 && (
				<div className="flex flex-wrap gap-1 mb-3">
					{item.games.slice(0, 3).map((game) => (
						<Link
							key={game.id}
							to="/games/$slug"
							params={{ slug: game.slug }}
							className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700/50 hover:bg-gray-700 rounded-full text-xs transition-colors"
						>
							{game.coverUrl ? (
								<img
									src={game.coverUrl}
									alt=""
									className="w-3 h-4 rounded object-cover"
								/>
							) : (
								<Gamepad2 size={10} className="text-gray-400" />
							)}
							<span className="text-gray-300">{game.name}</span>
						</Link>
					))}
					{item.games.length > 3 && (
						<span className="text-xs text-gray-500">
							+{item.games.length - 3} more
						</span>
					)}
				</div>
			)}

			{/* Content */}
			<div className="text-gray-300 mb-3">
				{item.type === "post" ? (
					<p className="whitespace-pre-wrap">{item.content}</p>
				) : (
					<p className="line-clamp-3">
						{item.excerpt ||
							item.content.slice(0, 200) +
								(item.content.length > 200 ? "..." : "")}
					</p>
				)}
			</div>

			{/* Read More Link (for articles and reviews) */}
			{config.link && (
				<Link
					to={config.link}
					className="text-sm text-purple-400 hover:text-purple-300 transition-colors mb-3 inline-block"
				>
					Read more →
				</Link>
			)}

			{/* Top Comment */}
			{localTopComment && (
				<div className="mt-3 pt-3 border-t border-gray-700/50">
					<div className="flex items-start gap-2">
						<Link
							to="/profile/$username"
							params={{ username: localTopComment.author.username }}
							className="flex-shrink-0"
						>
							<div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
								{localTopComment.author.avatarUrl ? (
									<img
										src={localTopComment.author.avatarUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
										{(localTopComment.author.displayName ||
											localTopComment.author.username)[0].toUpperCase()}
									</span>
								)}
							</div>
						</Link>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<Link
									to="/profile/$username"
									params={{ username: localTopComment.author.username }}
									className="text-sm font-medium text-white hover:text-purple-400"
								>
									{localTopComment.author.displayName ||
										localTopComment.author.username}
								</Link>
								<span className="text-xs text-gray-500">
									{formatDistanceToNow(new Date(localTopComment.createdAt))}
								</span>
							</div>
							<p className="text-sm text-gray-400 line-clamp-2">
								{localTopComment.content}
							</p>

							<div className="flex items-center gap-4 mt-2">
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										if (localTopComment.id)
											handleCommentLike(localTopComment.id);
									}}
									disabled={!isSignedIn || isLikingComment}
									className={`flex items-center gap-1 text-xs transition-colors ${
										hasLikedComment
											? "text-pink-500 hover:text-pink-400"
											: "text-gray-500 hover:text-gray-400"
									}`}
								>
									<Heart
										className={`w-3 h-3 ${hasLikedComment ? "fill-current" : ""}`}
									/>
									{commentLikeCount > 0 && <span>{commentLikeCount}</span>}
								</button>
								<button
									type="button"
									className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400"
									onClick={(e) => {
										e.preventDefault();
										// Reply handler
									}}
								>
									<Reply className="w-3 h-3" />
									Reply
								</button>
							</div>
						</div>
					</div>
					{localCommentCount > 1 && (
						<div className="mt-2">
							{item.type === "post" && (
								<Link
									to="/posts/$id"
									params={{ id: item.id }}
									className="text-xs text-gray-500 hover:text-gray-400"
								>
									View all {localCommentCount} comments
								</Link>
							)}
							{item.type === "article" && (
								<Link
									to="/articles/$id"
									params={{ id: item.id }}
									className="text-xs text-gray-500 hover:text-gray-400"
								>
									View all {localCommentCount} comments
								</Link>
							)}
							{item.type === "review" && (
								<Link
									to="/reviews/$id"
									params={{ id: item.id }}
									className="text-xs text-gray-500 hover:text-gray-400"
								>
									View all {localCommentCount} comments
								</Link>
							)}
						</div>
					)}
				</div>
			)}

			{/* Footer */}
			<div className="flex items-center gap-4 text-sm text-gray-500 pt-3 mt-3 border-t border-gray-700/50">
				<button
					type="button"
					onClick={handleToggleLike}
					disabled={!isSignedIn || isLiking}
					className={`flex items-center gap-1 transition-colors ${
						hasLiked
							? "text-pink-500 hover:text-pink-400"
							: "hover:text-pink-400"
					} ${!isSignedIn ? "cursor-default" : ""}`}
				>
					<Heart size={16} className={hasLiked ? "fill-current" : ""} />
					{localLikeCount}
				</button>
				<button
					type="button"
					onClick={() => setShowCommentInput(!showCommentInput)}
					className="flex items-center gap-1 hover:text-purple-400 transition-colors"
				>
					<MessageCircle size={16} />
					{localCommentCount}
				</button>
			</div>

			{/* Inline Comment Input */}
			{showCommentInput && isSignedIn && (
				<div className="mt-3 flex items-center gap-2">
					<div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex-shrink-0">
						{user?.imageUrl ? (
							<img
								src={user.imageUrl}
								alt=""
								className="w-full h-full object-cover"
							/>
						) : (
							<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
								{(user?.fullName || user?.username || "U")[0].toUpperCase()}
							</span>
						)}
					</div>
					<div className="flex-1 flex items-center gap-2 bg-gray-700/50 rounded-full pl-4 pr-2 py-2">
						<input
							type="text"
							value={commentText}
							onChange={(e) => setCommentText(e.target.value)}
							placeholder="Write a comment..."
							className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSubmitComment();
								}
							}}
						/>
						<button
							type="button"
							onClick={handleSubmitComment}
							disabled={!commentText.trim() || isSubmitting}
							className="p-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-pink-500 transition-all"
						>
							<Send size={14} />
						</button>
					</div>
				</div>
			)}

			{showCommentInput && !isSignedIn && (
				<div className="mt-3 text-sm text-gray-500 text-center">
					<Link to="/sign-in" className="text-purple-400 hover:underline">
						Sign in
					</Link>{" "}
					to comment
				</div>
			)}
		</div>
	);
}
