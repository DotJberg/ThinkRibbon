import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CommentItem } from "../../components/shared/CommentItem";
import { LikeButton } from "../../components/shared/LikeButton";
import { createComment, getPostComments } from "../../lib/server/comments";
import { getPostById, togglePostLike } from "../../lib/server/posts";

export const Route = createFileRoute("/posts/$id")({
	component: PostDetailPage,
});

function PostDetailPage() {
	const { id } = Route.useParams();
	const { user, isSignedIn } = useUser();
	const [post, setPost] = useState<Awaited<
		ReturnType<typeof getPostById>
	> | null>(null);
	const [comments, setComments] = useState<
		Awaited<ReturnType<typeof getPostComments>>["comments"]
	>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [commentText, setCommentText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [postData, commentsData] = await Promise.all([
				getPostById({ data: { id } }),
				getPostComments({ data: { postId: id, clerkId: user?.id } }),
			]);
			setPost(postData);
			setComments(commentsData.comments);
		} catch (error) {
			console.error("Failed to load data:", error);
		} finally {
			setIsLoading(false);
		}
	}, [id, user?.id]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleCreateComment = async () => {
		if (!commentText.trim() || !user || !post) return;
		setIsSubmitting(true);
		try {
			await createComment({
				data: {
					content: commentText,
					authorClerkId: user.id,
					postId: post.id,
				},
			});
			setCommentText("");
			// Refresh comments
			const { comments } = await getPostComments({
				data: { postId: post.id, clerkId: user.id },
			});
			setComments(comments);
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

	if (!post) {
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
									· {formatDistanceToNow(new Date(post.createdAt))} ago
								</span>
							</div>
						</div>
					</div>

					<p className="text-white whitespace-pre-wrap text-lg mb-6">
						{post.content}
					</p>

					<div className="flex items-center gap-6 border-t border-gray-700/50 pt-4">
						<LikeButton
							likeCount={post._count.likes}
							onToggle={
								user
									? () =>
											togglePostLike({
												data: { postId: post.id, clerkId: user.id },
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
								key={comment.id}
								comment={comment}
								postId={post.id}
								onReplySuccess={async () => {
									const { comments } = await getPostComments({
										data: { postId: post.id, clerkId: user?.id },
									});
									setComments(comments);
								}}
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
		</div>
	);
}
