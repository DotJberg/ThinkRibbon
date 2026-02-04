import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
	ArrowLeft,
	Edit3,
	Flag,
	History,
	MessageCircle,
	MoreHorizontal,
	Send,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EditPostModal } from "../../components/posts/EditPostModal";
import { PostImageGrid } from "../../components/posts/PostImageGrid";
import { CommentItem } from "../../components/shared/CommentItem";
import { DeleteConfirmationModal } from "../../components/shared/DeleteConfirmationModal";
import { LikeButton } from "../../components/shared/LikeButton";
import { ReportModal } from "../../components/shared/ReportModal";
import { VersionHistoryModal } from "../../components/shared/VersionHistoryModal";

export const Route = createFileRoute("/posts/$id")({
	component: PostDetailPage,
});

function PostDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const post = useQuery(api.posts.getById, { id: id as Id<"posts"> });
	const commentsData = useQuery(
		api.comments.getByTarget,
		post
			? { targetType: "post" as const, targetId: post._id, clerkId: user?.id }
			: "skip",
	);
	const comments = commentsData?.comments ?? [];
	const isLoading = post === undefined;
	const [commentText, setCommentText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showHistoryModal, setShowHistoryModal] = useState(false);
	const [showReportModal, setShowReportModal] = useState(false);
	const createCommentMut = useMutation(api.comments.create);
	const toggleLike = useMutation(api.likes.toggle);
	const deletePostMut = useMutation(api.posts.deletePost);

	// Only fetch history when modal is open
	const historyData = useQuery(
		api.posts.getHistory,
		showHistoryModal ? { postId: id as Id<"posts"> } : "skip",
	);

	// Check if user is admin
	const isAdmin = useQuery(
		api.users.isAdmin,
		user?.id ? { clerkId: user.id } : "skip",
	);

	const isAuthor = user && post?.author?.clerkId === user.id;
	const hasEdits = (post?.editCount ?? 0) > 0;
	const canEdit = isAuthor || isAdmin;
	const canReport = isSignedIn && !isAuthor;
	const showMenuButton = canEdit || hasEdits || canReport;

	const handleDelete = async () => {
		if (!user || !post) return;
		await deletePostMut({ postId: post._id, clerkId: user.id });
		navigate({ to: "/" });
	};

	const handleCreateComment = async () => {
		if (!commentText.trim() || !user || !post) return;
		setIsSubmitting(true);
		try {
			await createCommentMut({
				content: commentText,
				authorClerkId: user.id,
				targetType: "post",
				targetId: post._id,
			});
			setCommentText("");
		} catch (error) {
			console.error("Failed to create comment:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!post || !post.author) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-2">Post Not Found</h1>
					<Link to="/" className="text-purple-400 hover:underline">
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8 max-w-2xl">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					Back
				</Link>

				<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm mb-6">
					<div className="flex items-start gap-4 mb-4">
						<Link
							to="/profile/$username"
							params={{ username: post.author.username }}
							className="flex-shrink-0"
						>
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
								{post.author.avatarUrl ? (
									<img
										src={post.author.avatarUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
										{/* @ts-ignore */}
										{(post.author.displayName ||
											post.author.username)[0].toUpperCase()}
									</span>
								)}
							</div>
						</Link>
						<div className="flex-1">
							<div className="flex items-center gap-2">
								<Link
									to="/profile/$username"
									params={{ username: post.author.username }}
									className="font-bold text-white hover:text-purple-400"
								>
									{post.author.displayName || post.author.username}
								</Link>
								<span className="text-gray-500 text-sm">
									@{post.author.username}
								</span>
								<span className="text-gray-500 text-sm">
									· {formatDistanceToNow(new Date(post._creationTime))} ago
								</span>
								{hasEdits && (
									<span className="text-gray-600 text-xs">(edited)</span>
								)}
							</div>
						</div>

						{/* Action menu */}
						{showMenuButton && (
							<div className="relative">
								<button
									type="button"
									onClick={() => setShowMenu(!showMenu)}
									className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors"
								>
									<MoreHorizontal size={20} />
								</button>
								{showMenu && (
									<>
										{/* biome-ignore lint/a11y/noStaticElementInteractions: Dropdown backdrop */}
										{/* biome-ignore lint/a11y/useKeyWithClickEvents: Click only for backdrop */}
										<div
											className="fixed inset-0 z-40"
											onClick={() => setShowMenu(false)}
										/>
										<div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]">
											{canEdit && (
												<button
													type="button"
													onClick={() => {
														setShowMenu(false);
														setShowEditModal(true);
													}}
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
												>
													<Edit3 size={16} />
													Edit
												</button>
											)}
											{hasEdits && (
												<button
													type="button"
													onClick={() => {
														setShowMenu(false);
														setShowHistoryModal(true);
													}}
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
												>
													<History size={16} />
													View History
												</button>
											)}
											{canEdit && (
												<button
													type="button"
													onClick={() => {
														setShowMenu(false);
														setShowDeleteModal(true);
													}}
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
												>
													<Trash2 size={16} />
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
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-400 hover:bg-gray-700 hover:text-orange-300 transition-colors"
												>
													<Flag size={16} />
													Report
												</button>
											)}
										</div>
									</>
								)}
							</div>
						)}
					</div>

					<p className="text-white whitespace-pre-wrap text-lg mb-6">
						{post.content}
					</p>

					{post.images && post.images.length > 0 && (
						<div className="mb-6">
							<PostImageGrid images={post.images} />
						</div>
					)}

					<div className="flex items-center gap-6 border-t border-gray-700/50 pt-4">
						<LikeButton
							likeCount={post._count.likes}
							onToggle={
								user
									? () =>
											toggleLike({
												clerkId: user.id,
												targetType: "post",
												targetId: post._id,
											})
									: async () => ({ liked: false })
							}
							disabled={!isSignedIn}
						/>
						<div className="flex items-center gap-2 text-gray-400">
							<MessageCircle size={20} />
							<span>{post._count.comments}</span>
						</div>
					</div>
				</div>

				{/* Comments Section */}
				<div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
					<h3 className="text-xl font-bold text-white mb-6">Comments</h3>

					{/* Comment Input */}
					{isSignedIn && (
						<div className="flex gap-3 mb-8">
							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex-shrink-0">
								{user?.imageUrl ? (
									<img
										src={user.imageUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="w-full h-full flex items-center justify-center text-white font-bold">
										{(user?.fullName || user?.username || "U")[0].toUpperCase()}
									</span>
								)}
							</div>
							<div className="flex-1 flex gap-2">
								<input
									type="text"
									value={commentText}
									onChange={(e) => setCommentText(e.target.value)}
									className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
									placeholder="Write a comment..."
									onKeyDown={(e) =>
										e.key === "Enter" && !e.shiftKey && handleCreateComment()
									}
								/>
								<button
									type="button"
									onClick={handleCreateComment}
									disabled={!commentText.trim() || isSubmitting}
									className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
								>
									<Send size={20} />
								</button>
							</div>
						</div>
					)}

					{/* Comments List */}
					<div className="space-y-6">
						{comments.map((comment) => (
							<CommentItem
								key={comment._id}
								comment={comment}
								targetType="post"
								targetId={post._id}
								onReplySuccess={() => {}}
							/>
						))}
						{comments.length === 0 && (
							<div className="text-center text-gray-500 py-8">
								No comments yet. Be the first to start the conversation!
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Modals */}
			<EditPostModal
				isOpen={showEditModal}
				onClose={() => setShowEditModal(false)}
				postId={post._id}
				currentContent={post.content}
			/>

			<DeleteConfirmationModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDelete}
				title="Delete Post"
				description="Are you sure you want to delete this post? This action cannot be undone."
			/>

			<VersionHistoryModal
				isOpen={showHistoryModal}
				onClose={() => setShowHistoryModal(false)}
				contentType="post"
				current={historyData?.current ?? null}
				versions={historyData?.versions ?? []}
			/>

			<ReportModal
				isOpen={showReportModal}
				onClose={() => setShowReportModal(false)}
				targetType="post"
				targetId={post._id}
			/>
		</div>
	);
}
