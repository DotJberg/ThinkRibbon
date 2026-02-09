import { useUser } from "@clerk/clerk-react";
import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	Calendar,
	Edit3,
	Flag,
	Gamepad2,
	History,
	MoreHorizontal,
	Send,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RichTextContent } from "../../components/editor/RichTextEditor";
import { CommentItem } from "../../components/shared/CommentItem";
import { DeleteConfirmationModal } from "../../components/shared/DeleteConfirmationModal";
import { EmojiPickerButton } from "../../components/shared/EmojiPickerButton";
import { LikeButton } from "../../components/shared/LikeButton";
import { PixelSpeechBubble } from "../../components/shared/PixelSpeechBubble";
import { ReportModal } from "../../components/shared/ReportModal";
import { SafeImage } from "../../components/shared/SafeImage";
import {
	SpoilerBadge,
	SpoilerWarning,
} from "../../components/shared/SpoilerWarning";
import { StarRating } from "../../components/shared/StarRating";
import { TagDisplay } from "../../components/shared/TagDisplay";
import { VersionHistoryModal } from "../../components/shared/VersionHistoryModal";
import { getConvexClient } from "../../lib/convex-server";
import { buildMeta, seoTitle, seoUrl, truncate } from "../../lib/seo";

export const Route = createFileRoute("/reviews/$id")({
	loader: async ({ params }) => {
		try {
			const client = getConvexClient();
			const review = await client.query(api.reviews.getById, {
				reviewId: params.id as Id<"reviews">,
			});
			return { review };
		} catch {
			return { review: null };
		}
	},
	head: ({ loaderData }) => {
		const review = loaderData?.review;
		if (!review) return {};
		const authorName =
			review.author?.displayName || review.author?.username || "";
		const gameName = review.game?.name || "a game";
		const description = truncate(
			`A ${review.rating}/5 review of ${gameName} by ${authorName}`,
		);
		return {
			meta: buildMeta({
				title: seoTitle(`${review.title} - ${gameName} Review`),
				description,
				url: seoUrl(`/reviews/${review._id}`),
				image: review.coverImageUrl || review.game?.coverUrl,
			}),
		};
	},
	component: ReviewDetailPage,
});

function ReviewDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const router = useRouter();
	const { user, isSignedIn } = useUser();

	const handleBack = useCallback(() => {
		if (window.history.length > 1) {
			router.history.back();
		} else {
			router.navigate({ to: "/" });
		}
	}, [router]);
	const review = useQuery(api.reviews.getById, {
		reviewId: id as Id<"reviews">,
	});
	const hasLiked = useQuery(
		api.likes.hasLiked,
		user && review
			? {
					clerkId: user.id,
					targetType: "review" as const,
					targetId: review._id,
				}
			: "skip",
	);
	const isLoading = review === undefined;
	const commentsData = useQuery(
		api.comments.getByTarget,
		review
			? {
					targetType: "review" as const,
					targetId: review._id,
					clerkId: user?.id,
				}
			: "skip",
	);
	const comments = commentsData?.comments ?? [];
	const [commentText, setCommentText] = useState("");
	const [isSubmittingComment, setIsSubmittingComment] = useState(false);
	const [spoilerAccepted, setSpoilerAccepted] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showHistoryModal, setShowHistoryModal] = useState(false);
	const [showReportModal, setShowReportModal] = useState(false);
	const toggleLike = useMutation(api.likes.toggle);
	const createCommentMut = useMutation(api.comments.create);
	const deleteReviewMut = useMutation(api.reviews.deleteReview);

	// Only fetch history when modal is open
	const historyData = useQuery(
		api.reviews.getHistory,
		showHistoryModal ? { reviewId: id as Id<"reviews"> } : "skip",
	);

	// Check if user is admin
	const isAdmin = useQuery(
		api.users.isAdmin,
		user?.id ? { clerkId: user.id } : "skip",
	);

	const isAuthor = user && review?.author?.clerkId === user.id;
	const hasEdits = (review?.editCount ?? 0) > 0;
	const canEdit = isAuthor || isAdmin;
	const canReport = isSignedIn && !isAuthor;
	const showMenuButton = canEdit || hasEdits || canReport;

	const handleDelete = async () => {
		if (!user || !review) return;
		await deleteReviewMut({ reviewId: review._id, clerkId: user.id });
		navigate({ to: "/" });
	};

	const handleCreateComment = async () => {
		if (!commentText.trim() || !user || !review) return;
		setIsSubmittingComment(true);
		try {
			await createCommentMut({
				content: commentText,
				authorClerkId: user.id,
				targetType: "review",
				targetId: review._id,
			});
			setCommentText("");
		} catch (error) {
			console.error("Failed to create comment:", error);
		} finally {
			setIsSubmittingComment(false);
		}
	};

	// Handle escape key for spoiler warning
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && review?.containsSpoilers && !spoilerAccepted) {
				handleBack();
			}
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [review, spoilerAccepted, handleBack]);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!review || !review.author || !review.game) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-2">
						Review Not Found
					</h1>
					<Link to="/" className="text-slate-400 hover:underline">
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	// Show spoiler warning if content has spoilers and user hasn't accepted
	if (review.containsSpoilers && !spoilerAccepted) {
		return (
			<SpoilerWarning
				title={review.title}
				contentType="review"
				onGoBack={handleBack}
				onContinue={() => setSpoilerAccepted(true)}
			/>
		);
	}

	const createdAt = new Date(review._creationTime).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	// Check if content is JSON (TipTap) or plain text
	const isJsonContent =
		review.content.startsWith("{") || review.content.startsWith("[");

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20">
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<button
					type="button"
					onClick={handleBack}
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					Back
				</button>

				<article>
					{/* Cover Image (if uploaded) */}
					{review.coverImageUrl && (
						<div className="aspect-video bg-gray-800 rounded-xl overflow-hidden mb-8">
							<SafeImage
								src={review.coverImageUrl}
								alt={review.title}
								className="w-full h-full object-cover"
								fallback={
									<div className="w-full h-full flex items-center justify-center bg-gray-800">
										<Gamepad2 className="text-gray-600" size={48} />
									</div>
								}
							/>
						</div>
					)}

					{/* Header */}
					<div className="flex flex-col md:flex-row gap-6 mb-8">
						{/* Game Cover */}
						<Link to="/games/$slug" params={{ slug: review.game.slug }}>
							<div className="w-32 md:w-40 aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
								<SafeImage
									src={review.game.coverUrl || undefined}
									alt={review.game.name}
									className="w-full h-full object-cover"
									fallback={
										<div className="w-full h-full flex items-center justify-center bg-gray-800">
											<Gamepad2 className="text-gray-600" size={32} />
										</div>
									}
								/>
							</div>
						</Link>

						<div className="flex-1">
							<Link
								to="/games/$slug"
								params={{ slug: review.game.slug }}
								className="text-slate-400 hover:text-slate-300 text-sm font-medium"
							>
								{review.game.name}
							</Link>
							<div className="flex items-start gap-3 mt-1 mb-4">
								<h1 className="text-3xl font-bold text-white flex-1">
									{review.title}
								</h1>
								{review.containsSpoilers && <SpoilerBadge />}

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
														<Link
															to="/reviews/edit/$id"
															params={{ id }}
															onClick={() => setShowMenu(false)}
															className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
														>
															<Edit3 size={16} />
															Edit
														</Link>
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
							<StarRating rating={review.rating} size="lg" />

							{/* Tags & Genres */}
							{(() => {
								const displayGenres =
									review.genres && review.genres.length > 0
										? review.genres
										: review.game?.genres;
								return review.tags?.length ||
									(displayGenres && displayGenres.length > 0) ? (
									<div className="mt-3">
										<TagDisplay tags={review.tags} genres={displayGenres} />
									</div>
								) : null;
							})()}

							{/* Author */}
							<div className="flex items-center gap-3 mt-4">
								<Link
									to="/profile/$username"
									params={{ username: review.author.username }}
								>
									<div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden">
										<SafeImage
											src={review.author.avatarUrl || undefined}
											alt=""
											className="w-full h-full object-cover"
											fallback={
												<span className="w-full h-full flex items-center justify-center text-white font-bold">
													{(review.author.displayName ||
														review.author.username)[0].toUpperCase()}
												</span>
											}
										/>
									</div>
								</Link>
								<div>
									<Link
										to="/profile/$username"
										params={{ username: review.author.username }}
										className="text-white font-medium hover:text-slate-400"
									>
										{review.author.displayName || review.author.username}
									</Link>
									<div className="text-sm text-gray-500 flex items-center gap-1">
										<Calendar size={14} />
										{createdAt}
										{hasEdits && (
											<span className="text-gray-600 text-xs ml-1">
												(edited)
											</span>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Content */}
					<div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 md:p-8">
						{isJsonContent ? (
							<RichTextContent content={review.content} />
						) : (
							<div className="prose prose-invert prose-lg max-w-none">
								<div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
									{review.content}
								</div>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex items-center gap-4 mt-6">
						<LikeButton
							initialLiked={hasLiked ?? false}
							likeCount={review._count.likes}
							onToggle={
								user
									? () =>
											toggleLike({
												clerkId: user.id,
												targetType: "review",
												targetId: review._id,
											})
									: async () => ({ liked: false })
							}
							disabled={!isSignedIn}
						/>
						<span className="flex items-center gap-1 text-gray-400">
							<PixelSpeechBubble size={18} />
							{review._count.comments} comments
						</span>
					</div>

					{/* Comments Section */}
					<div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm mt-8">
						<h3 className="text-xl font-bold text-white mb-6">Comments</h3>

						{isSignedIn && (
							<div className="flex gap-3 mb-8">
								<div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden flex-shrink-0">
									{user?.imageUrl ? (
										<img
											src={user.imageUrl}
											alt=""
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="w-full h-full flex items-center justify-center text-white font-bold">
											{(user?.fullName ||
												user?.username ||
												"U")[0].toUpperCase()}
										</span>
									)}
								</div>
								<div className="flex-1 flex gap-2">
									<input
										type="text"
										value={commentText}
										onChange={(e) => setCommentText(e.target.value)}
										className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
										placeholder="Write a comment..."
										onKeyDown={(e) =>
											e.key === "Enter" && !e.shiftKey && handleCreateComment()
										}
									/>
									<EmojiPickerButton
										onEmojiSelect={(emoji) =>
											setCommentText((prev) => prev + emoji)
										}
									/>
									<button
										type="button"
										onClick={handleCreateComment}
										disabled={!commentText.trim() || isSubmittingComment}
										className="p-2 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
									>
										<Send size={20} />
									</button>
								</div>
							</div>
						)}

						<div className="space-y-6">
							{comments.map((comment) => (
								<CommentItem
									key={comment._id}
									comment={comment}
									targetType="review"
									targetId={review._id}
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
				</article>
			</div>

			{/* Modals */}
			<DeleteConfirmationModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDelete}
				title="Delete Review"
				description="Are you sure you want to delete this review? This action cannot be undone."
			/>

			<VersionHistoryModal
				isOpen={showHistoryModal}
				onClose={() => setShowHistoryModal(false)}
				contentType="review"
				current={historyData?.current ?? null}
				versions={historyData?.versions ?? []}
			/>

			<ReportModal
				isOpen={showReportModal}
				onClose={() => setShowReportModal(false)}
				targetType="review"
				targetId={review._id}
			/>
		</div>
	);
}
