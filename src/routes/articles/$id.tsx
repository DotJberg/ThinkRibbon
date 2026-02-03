import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	Calendar,
	Edit3,
	Gamepad2,
	History,
	MessageCircle,
	MoreHorizontal,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RichTextContent } from "../../components/editor/RichTextEditor";
import { DeleteConfirmationModal } from "../../components/shared/DeleteConfirmationModal";
import { LikeButton } from "../../components/shared/LikeButton";
import {
	SpoilerBadge,
	SpoilerWarning,
} from "../../components/shared/SpoilerWarning";
import { VersionHistoryModal } from "../../components/shared/VersionHistoryModal";

export const Route = createFileRoute("/articles/$id")({
	component: ArticleDetailPage,
});

function ArticleDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const article = useQuery(api.articles.getById, {
		articleId: id as Id<"articles">,
	});
	const isLoading = article === undefined;
	const [spoilerAccepted, setSpoilerAccepted] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showHistoryModal, setShowHistoryModal] = useState(false);
	const toggleLike = useMutation(api.likes.toggle);
	const deleteArticleMut = useMutation(api.articles.deleteArticle);

	// Only fetch history when modal is open
	const historyData = useQuery(
		api.articles.getHistory,
		showHistoryModal ? { articleId: id as Id<"articles"> } : "skip",
	);

	const isAuthor = user && article?.author?.clerkId === user.id;
	const hasEdits = (article?.editCount ?? 0) > 0;

	const handleDelete = async () => {
		if (!user || !article) return;
		await deleteArticleMut({ articleId: article._id, clerkId: user.id });
		navigate({ to: "/" });
	};

	// Handle escape key for spoiler warning
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && article?.containsSpoilers && !spoilerAccepted) {
				navigate({ to: "/" });
			}
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [article, spoilerAccepted, navigate]);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!article || !article.author) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-2">
						Article Not Found
					</h1>
					<Link to="/" className="text-purple-400 hover:underline">
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	// Show spoiler warning if content has spoilers and user hasn't accepted
	if (article.containsSpoilers && !spoilerAccepted) {
		return (
			<SpoilerWarning
				title={article.title}
				contentType="article"
				onGoBack={() => navigate({ to: "/" })}
				onContinue={() => setSpoilerAccepted(true)}
			/>
		);
	}

	const createdAt = new Date(article._creationTime).toLocaleDateString(
		"en-US",
		{
			month: "long",
			day: "numeric",
			year: "numeric",
		},
	);

	// Check if content is JSON (TipTap) or plain text
	const isJsonContent =
		article.content.startsWith("{") || article.content.startsWith("[");

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					Back
				</Link>

				<article>
					{/* Cover Image */}
					{article.coverImageUrl && (
						<div className="aspect-video bg-gray-800 rounded-xl overflow-hidden mb-8">
							<img
								src={article.coverImageUrl}
								alt={article.title}
								className="w-full h-full object-cover"
							/>
						</div>
					)}

					{/* Header */}
					<header className="mb-8">
						<div className="flex items-start gap-3 mb-4">
							<h1 className="text-4xl font-bold text-white flex-1">
								{article.title}
							</h1>
							{article.containsSpoilers && <SpoilerBadge />}

							{/* Action menu */}
							{(isAuthor || hasEdits) && (
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
												{isAuthor && (
													<Link
														to="/articles/edit/$id"
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
												{isAuthor && (
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
											</div>
										</>
									)}
								</div>
							)}
						</div>

						{/* Author */}
						<div className="flex items-center gap-3 mb-4">
							<Link
								to="/profile/$username"
								params={{ username: article.author.username }}
							>
								<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
									{article.author.avatarUrl ? (
										<img
											src={article.author.avatarUrl}
											alt=""
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="w-full h-full flex items-center justify-center text-white font-bold">
											{(article.author.displayName ||
												article.author.username)[0].toUpperCase()}
										</span>
									)}
								</div>
							</Link>
							<div>
								<Link
									to="/profile/$username"
									params={{ username: article.author.username }}
									className="text-white font-medium hover:text-purple-400"
								>
									{article.author.displayName || article.author.username}
								</Link>
								<div className="text-sm text-gray-500 flex items-center gap-1">
									<Calendar size={14} />
									{createdAt}
									{hasEdits && (
										<span className="text-gray-600 text-xs ml-1">(edited)</span>
									)}
								</div>
							</div>
						</div>

						{/* Game Tags */}
						{article.games.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{article.games
									.filter((game) => game !== null)
									.map((game) => (
										<Link
											key={game._id}
											to="/games/$slug"
											params={{ slug: game.slug }}
											className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm transition-colors"
										>
											{game.coverUrl ? (
												<img
													src={game.coverUrl}
													alt=""
													className="w-4 h-5 rounded object-cover"
												/>
											) : (
												<Gamepad2 size={14} className="text-gray-400" />
											)}
											<span className="text-gray-300">{game.name}</span>
										</Link>
									))}
							</div>
						)}
					</header>

					{/* Content */}
					<div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 md:p-8">
						{isJsonContent ? (
							<RichTextContent content={article.content} />
						) : (
							<div className="prose prose-invert prose-lg max-w-none">
								<div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
									{article.content}
								</div>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex items-center gap-4 mt-6">
						<LikeButton
							likeCount={article._count.likes}
							onToggle={
								user
									? () =>
											toggleLike({
												clerkId: user.id,
												targetType: "article",
												targetId: article._id,
											})
									: async () => ({ liked: false })
							}
							disabled={!isSignedIn}
						/>
						<span className="flex items-center gap-1 text-gray-400">
							<MessageCircle size={18} />
							{article._count.comments} comments
						</span>
					</div>
				</article>
			</div>

			{/* Modals */}
			<DeleteConfirmationModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDelete}
				title="Delete Article"
				description="Are you sure you want to delete this article? This action cannot be undone."
			/>

			<VersionHistoryModal
				isOpen={showHistoryModal}
				onClose={() => setShowHistoryModal(false)}
				contentType="article"
				current={historyData?.current ?? null}
				versions={historyData?.versions ?? []}
			/>
		</div>
	);
}
