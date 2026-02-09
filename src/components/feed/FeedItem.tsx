import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Edit3,
	FileText,
	Flag,
	Gamepad2,
	MoreHorizontal,
	Reply,
	Send,
	Star,
	Trash2,
	TrendingUp,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { stripFirstUrl } from "../../lib/link-preview";
import { EditPostModal } from "../posts/EditPostModal";
import { PostImageGrid } from "../posts/PostImageGrid";
import { DeleteConfirmationModal } from "../shared/DeleteConfirmationModal";
import { EmojiPickerButton } from "../shared/EmojiPickerButton";
import { LikersModal } from "../shared/LikersModal";
import { LinkPreviewCard } from "../shared/LinkPreviewCard";
import { PixelHeart } from "../shared/PixelHeart";
import { PixelSpeechBubble } from "../shared/PixelSpeechBubble";
import { ReportModal } from "../shared/ReportModal";
import { SafeImage } from "../shared/SafeImage";
import { SpoilerBadge } from "../shared/SpoilerWarning";
import { TagDisplay } from "../shared/TagDisplay";

// FeedItem type (previously from lib/server/feed)
interface FeedItem {
	type: "post" | "article" | "review";
	id: string;
	createdAt: number;
	updatedAt?: number;
	editCount?: number;
	author: {
		_id: string;
		clerkId: string;
		username: string;
		displayName: string | undefined;
		avatarUrl: string | undefined;
	};
	content: string;
	title?: string;
	excerpt?: string;
	coverImageUrl?: string;
	images?: Array<{
		url: string;
		caption?: string;
	}>;
	linkPreview?: {
		url: string;
		title?: string;
		description?: string;
		imageUrl?: string;
		siteName?: string;
		domain: string;
	};
	containsSpoilers?: boolean;
	rating?: number;
	tags?: string[];
	genres?: string[];
	game?: {
		_id: string;
		name: string;
		slug: string;
		coverUrl: string | undefined;
	};
	games?: Array<{
		_id: string;
		name: string;
		slug: string;
		coverUrl: string | undefined;
	}>;
	likeCount: number;
	commentCount: number;
	topComment?: {
		id: string;
		content: string;
		createdAt: number;
		likeCount: number;
		hasLiked: boolean;
		author: {
			_id: string;
			username: string;
			displayName: string | undefined;
			avatarUrl: string | undefined;
		};
	};
	hasLiked: boolean;
}

export type { FeedItem };

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

export const FeedItemCard = memo(function FeedItemCard({
	item,
	onCommentAdded,
}: FeedItemCardProps) {
	const { user, isSignedIn } = useUser();
	const toggleLike = useMutation(api.likes.toggle);
	const createCommentMut = useMutation(api.comments.create);
	const deletePostMut = useMutation(api.posts.deletePost);
	const deleteArticleMut = useMutation(api.articles.deleteArticle);
	const deleteReviewMut = useMutation(api.reviews.deleteReview);
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
	const [showMenu, setShowMenu] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showReportModal, setShowReportModal] = useState(false);
	const [isDeleted, setIsDeleted] = useState(false);
	const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
	const [showLikersModal, setShowLikersModal] = useState(false);

	const isAdmin = useQuery(
		api.users.isAdmin,
		user?.id ? { clerkId: user.id } : "skip",
	);

	const isAuthor = user && item.author.clerkId === user.id;
	const canEdit = isAuthor || isAdmin;
	const canReport = isSignedIn;

	const handleDelete = async () => {
		if (!user) return;
		if (item.type === "post") {
			await deletePostMut({
				postId: item.id as Id<"posts">,
				clerkId: user.id,
			});
		} else if (item.type === "article") {
			await deleteArticleMut({
				articleId: item.id as Id<"articles">,
				clerkId: user.id,
			});
		} else if (item.type === "review") {
			await deleteReviewMut({
				reviewId: item.id as Id<"reviews">,
				clerkId: user.id,
			});
		}
		setIsDeleted(true);
	};

	const typeConfig = {
		post: {
			icon: TrendingUp,
			color: "slate",
			label: "Post",
			link: `/posts/${item.id}`,
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

	const handleCommentLike = useCallback(
		async (commentId: string) => {
			if (!isSignedIn || !user || isLikingComment) return;

			setIsLikingComment(true);
			const previousHasLiked = hasLikedComment;
			const previousCount = commentLikeCount;

			setHasLikedComment(!previousHasLiked);
			setCommentLikeCount(
				previousHasLiked ? previousCount - 1 : previousCount + 1,
			);

			try {
				const result = await toggleLike({
					clerkId: user.id,
					targetType: "comment",
					targetId: commentId,
				});
				if (typeof result.liked === "boolean") {
					setHasLikedComment(result.liked);
					if (result.liked !== !previousHasLiked) {
						setCommentLikeCount(
							result.liked ? previousCount + 1 : previousCount,
						);
					}
				}
			} catch (error) {
				console.error("Error liking comment:", error);
				setHasLikedComment(previousHasLiked);
				setCommentLikeCount(previousCount);
			} finally {
				setIsLikingComment(false);
			}
		},
		[
			isSignedIn,
			user,
			isLikingComment,
			hasLikedComment,
			commentLikeCount,
			toggleLike,
		],
	);

	const handleToggleLike = useCallback(
		async (e: React.MouseEvent) => {
			e.preventDefault();
			if (!user || isLiking) return;

			setIsLiking(true);
			try {
				const result = await toggleLike({
					clerkId: user.id,
					targetType: item.type,
					targetId: item.id,
				});
				setHasLiked(result.liked);
				setLocalLikeCount((prev) => (result.liked ? prev + 1 : prev - 1));
			} catch (error) {
				console.error("Failed to toggle like:", error);
			} finally {
				setIsLiking(false);
			}
		},
		[user, isLiking, toggleLike, item.type, item.id],
	);

	const handleSubmitComment = useCallback(async () => {
		if (!commentText.trim() || !user) return;
		setIsSubmitting(true);
		try {
			const newComment = await createCommentMut({
				content: commentText.trim(),
				authorClerkId: user.id,
				targetType: item.type,
				targetId: item.id,
				...(replyToCommentId
					? { parentId: replyToCommentId as Id<"comments"> }
					: {}),
			});

			if (newComment && !replyToCommentId) {
				// Type assertion for the comment response from Convex
				const comment = newComment as {
					_id: string;
					content: string;
					author: {
						_id: string;
						username: string;
						displayName?: string;
						avatarUrl?: string;
					};
				};
				setLocalTopComment({
					id: comment._id,
					content: comment.content,
					createdAt: Date.now(),
					likeCount: 0,
					hasLiked: false,
					author: {
						_id: comment.author._id,
						username: comment.author.username,
						displayName: comment.author.displayName,
						avatarUrl: comment.author.avatarUrl,
					},
				});
			}
			setLocalCommentCount((prev) => prev + 1);
			setCommentText("");
			setShowCommentInput(false);
			setReplyToCommentId(null);
			onCommentAdded?.();
		} catch (error) {
			console.error("Failed to add comment:", error);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		commentText,
		user,
		createCommentMut,
		item.type,
		item.id,
		replyToCommentId,
		onCommentAdded,
	]);

	if (isDeleted) return null;

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
						<div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden">
							<SafeImage
								src={item.author.avatarUrl || undefined}
								alt=""
								className="w-full h-full object-cover"
								fallback={
									<span className="w-full h-full flex items-center justify-center text-white font-bold">
										{(item.author.displayName ||
											item.author.username)[0].toUpperCase()}
									</span>
								}
							/>
						</div>
					</Link>
					<div>
						<Link
							to="/profile/$username"
							params={{ username: item.author.username }}
							className="font-medium text-white hover:text-slate-400 transition-colors"
						>
							{item.author.displayName || item.author.username}
						</Link>
						<div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
							<span>@{item.author.username}</span>
							<span>·</span>
							<span>{formatDistanceToNow(new Date(item.createdAt))}</span>
							{(item.editCount ?? 0) > 0 && (
								<span className="text-gray-600 text-xs">(edited)</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Type Badge */}
					<span
						className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
							item.type === "post"
								? "bg-slate-500/20 text-slate-300"
								: item.type === "review"
									? "bg-yellow-500/20 text-yellow-300"
									: "bg-blue-500/20 text-blue-300"
						}`}
					>
						<Icon size={12} />
						{config.label}
					</span>

					{/* Action Menu */}
					{(canEdit || canReport) && (
						<div className="relative">
							<button
								type="button"
								onClick={() => setShowMenu(!showMenu)}
								className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors"
							>
								<MoreHorizontal size={18} />
							</button>
							{showMenu && (
								<>
									{/* biome-ignore lint/a11y/noStaticElementInteractions: Dropdown backdrop */}
									{/* biome-ignore lint/a11y/useKeyWithClickEvents: Click only for backdrop */}
									<div
										className="fixed inset-0 z-40"
										onClick={() => setShowMenu(false)}
									/>
									<div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
										{canEdit && item.type === "post" && (
											<button
												type="button"
												onClick={() => {
													setShowMenu(false);
													setShowEditModal(true);
												}}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
											>
												<Edit3 size={14} />
												Edit
											</button>
										)}
										{canEdit && item.type === "article" && (
											<Link
												to="/articles/edit/$id"
												params={{ id: item.id }}
												onClick={() => setShowMenu(false)}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
											>
												<Edit3 size={14} />
												Edit
											</Link>
										)}
										{canEdit && item.type === "review" && (
											<Link
												to="/reviews/edit/$id"
												params={{ id: item.id }}
												onClick={() => setShowMenu(false)}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
											>
												<Edit3 size={14} />
												Edit
											</Link>
										)}
										{canEdit && (
											<button
												type="button"
												onClick={() => {
													setShowMenu(false);
													setShowDeleteModal(true);
												}}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
											>
												<Trash2 size={14} />
												Delete
											</button>
										)}
										{canReport && (
											<button
												type="button"
												onClick={() => {
													setShowMenu(false);
													setShowReportModal(true);
												}}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-gray-700 hover:text-orange-300 transition-colors"
											>
												<Flag size={14} />
												Report
											</button>
										)}
									</div>
								</>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Title (for articles and reviews) */}
			{item.title && (
				<div className="flex items-start gap-2 mb-2">
					<h3 className="text-lg font-semibold text-white flex-1">
						{config.link ? (
							<Link
								to={config.link}
								className="hover:text-slate-400 transition-colors"
							>
								{item.title}
							</Link>
						) : (
							item.title
						)}
					</h3>
					{item.containsSpoilers && <SpoilerBadge className="flex-shrink-0" />}
				</div>
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

			{/* Cover Image (for reviews with user-uploaded cover) */}
			{item.type === "review" && item.coverImageUrl && (
				<Link to="/reviews/$id" params={{ id: item.id }} className="block mb-3">
					<div className="h-32 bg-gray-700 rounded-lg overflow-hidden">
						<SafeImage
							src={item.coverImageUrl}
							alt={item.title || "Review cover"}
							className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
							fallback={
								<div className="w-full h-full flex items-center justify-center bg-gray-800">
									<Gamepad2 className="text-gray-600" size={32} />
								</div>
							}
						/>
					</div>
				</Link>
			)}

			{/* Game (for reviews) */}
			{item.type === "review" && item.game && (
				<Link
					to="/games/$slug"
					params={{ slug: item.game.slug }}
					className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors w-fit"
				>
					<SafeImage
						src={item.game.coverUrl || undefined}
						alt=""
						className="w-6 h-8 rounded object-cover"
						fallback={<Gamepad2 size={16} className="text-gray-400" />}
					/>
					<span className="text-sm text-gray-300">{item.game.name}</span>
				</Link>
			)}

			{/* Tags (for reviews) */}
			{item.type === "review" && (item.tags?.length || item.genres?.length) && (
				<div className="mb-3">
					<TagDisplay tags={item.tags} genres={item.genres} />
				</div>
			)}

			{/* Games (for articles) */}
			{item.type === "article" && item.games && item.games.length > 0 && (
				<div className="flex flex-wrap gap-1 mb-3">
					{item.games.slice(0, 3).map((game) => (
						<Link
							key={game._id}
							to="/games/$slug"
							params={{ slug: game.slug }}
							className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700/50 hover:bg-gray-700 rounded-full text-xs transition-colors"
						>
							<SafeImage
								src={game.coverUrl || undefined}
								alt=""
								className="w-3 h-4 rounded object-cover"
								fallback={<Gamepad2 size={10} className="text-gray-400" />}
							/>
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

			{/* Tags (for articles) */}
			{item.type === "article" &&
				(item.tags?.length || item.genres?.length) && (
					<div className="mb-3">
						<TagDisplay tags={item.tags} genres={item.genres} />
					</div>
				)}

			{/* Content */}
			{item.type === "post" && (
				<div className="text-gray-300 mb-3">
					<p className="whitespace-pre-wrap break-words">
						{item.linkPreview ? stripFirstUrl(item.content) : item.content}
					</p>
					{item.images && item.images.length > 0 && (
						<PostImageGrid images={item.images} />
					)}
					{(!item.images || item.images.length === 0) && item.linkPreview && (
						<LinkPreviewCard
							url={item.linkPreview.url}
							title={item.linkPreview.title}
							description={item.linkPreview.description}
							imageUrl={item.linkPreview.imageUrl}
							siteName={item.linkPreview.siteName}
							domain={item.linkPreview.domain}
						/>
					)}
				</div>
			)}
			{item.type === "article" && item.excerpt && (
				<div className="text-gray-300 mb-3">
					<p className="line-clamp-3">{item.excerpt}</p>
				</div>
			)}
			{/* Reviews don't show content preview - they show title, rating, and game info above */}

			{/* Read More Link (for articles and reviews) */}
			{config.link && (
				<Link
					to={config.link}
					className="text-sm text-slate-400 hover:text-slate-300 transition-colors mb-3 inline-block"
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
							<div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden">
								<SafeImage
									src={localTopComment.author.avatarUrl || undefined}
									alt=""
									className="w-full h-full object-cover"
									fallback={
										<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
											{(localTopComment.author.displayName ||
												localTopComment.author.username)[0].toUpperCase()}
										</span>
									}
								/>
							</div>
						</Link>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<Link
									to="/profile/$username"
									params={{ username: localTopComment.author.username }}
									className="text-sm font-medium text-white hover:text-slate-400"
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
											? "text-red-500 hover:text-red-400"
											: "text-gray-500 hover:text-gray-400"
									}`}
								>
									<PixelHeart size={12} filled={hasLikedComment} />
									{commentLikeCount > 0 && <span>{commentLikeCount}</span>}
								</button>
								<button
									type="button"
									className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400"
									onClick={(e) => {
										e.preventDefault();
										if (localTopComment.id) {
											setReplyToCommentId(localTopComment.id);
											setShowCommentInput(true);
										}
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
			<div className="flex items-center gap-6 text-base text-gray-500 pt-3 mt-3 border-t border-gray-700/50">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleToggleLike}
						disabled={!isSignedIn || isLiking}
						className={`flex items-center transition-colors ${
							hasLiked
								? "text-red-500 hover:text-red-400"
								: "hover:text-red-400"
						} ${!isSignedIn ? "cursor-default" : ""}`}
					>
						<PixelHeart size={20} filled={hasLiked} animateOnFill />
					</button>
					<button
						type="button"
						onClick={() => setShowLikersModal(true)}
						className={`hover:underline ${hasLiked ? "text-red-500" : ""}`}
					>
						{localLikeCount}
					</button>
				</div>
				<button
					type="button"
					onClick={() => {
						setShowCommentInput(!showCommentInput);
						setReplyToCommentId(null);
					}}
					className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors"
				>
					<PixelSpeechBubble size={20} active={showCommentInput} />
					{localCommentCount}
				</button>
			</div>

			{/* Inline Comment Input */}
			{showCommentInput && isSignedIn && (
				<div className="mt-3">
					{replyToCommentId && localTopComment && (
						<div className="flex items-center gap-2 mb-1 ml-10 text-xs text-gray-400">
							<span>
								Replying to{" "}
								<span className="text-slate-400">
									@
									{localTopComment.author.displayName ||
										localTopComment.author.username}
								</span>
							</span>
							<button
								type="button"
								onClick={() => setReplyToCommentId(null)}
								className="text-gray-500 hover:text-gray-300"
							>
								Cancel
							</button>
						</div>
					)}
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden flex-shrink-0">
							<SafeImage
								src={user?.imageUrl}
								alt=""
								className="w-full h-full object-cover"
								fallback={
									<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
										{(user?.fullName || user?.username || "U")[0].toUpperCase()}
									</span>
								}
							/>
						</div>
						<div className="flex-1 flex items-center gap-2 bg-gray-700/50 rounded-full pl-4 pr-2 py-2 min-w-0">
							<input
								type="text"
								value={commentText}
								onChange={(e) => setCommentText(e.target.value)}
								placeholder={
									replyToCommentId ? "Write a reply..." : "Write a comment..."
								}
								className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleSubmitComment();
									}
								}}
							/>
							<EmojiPickerButton
								size={14}
								onEmojiSelect={(emoji) =>
									setCommentText((prev) => prev + emoji)
								}
							/>
							<button
								type="button"
								onClick={handleSubmitComment}
								disabled={!commentText.trim() || isSubmitting}
								className="p-1.5 rounded-full bg-gradient-to-r from-slate-700 to-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-slate-600 hover:to-slate-500 transition-all"
							>
								<Send size={14} />
							</button>
						</div>
					</div>
				</div>
			)}

			{showCommentInput && !isSignedIn && (
				<div className="mt-3 text-sm text-gray-500 text-center">
					<Link to="/sign-in" className="text-slate-400 hover:underline">
						Sign in
					</Link>{" "}
					to comment
				</div>
			)}

			{/* Modals */}
			{item.type === "post" && (
				<EditPostModal
					isOpen={showEditModal}
					onClose={() => setShowEditModal(false)}
					postId={item.id as Id<"posts">}
					currentContent={item.content}
					hasLinkPreview={!!item.linkPreview}
				/>
			)}

			<DeleteConfirmationModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDelete}
				title={`Delete ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`}
				description={`Are you sure you want to delete this ${item.type}? This action cannot be undone.`}
			/>

			<ReportModal
				isOpen={showReportModal}
				onClose={() => setShowReportModal(false)}
				targetType={item.type}
				targetId={item.id}
			/>

			<LikersModal
				isOpen={showLikersModal}
				onClose={() => setShowLikersModal(false)}
				targetType={item.type}
				targetId={item.id}
			/>
		</div>
	);
});
