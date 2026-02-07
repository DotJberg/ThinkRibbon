import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { ArrowLeft, Calendar, FileText, Gamepad2, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CollectionButton } from "../../components/collection/CollectionButton";
import { QuestLogButton } from "../../components/questlog/QuestLogButton";
import { ReviewCard } from "../../components/reviews/ReviewCard";
import { StarRatingDisplay } from "../../components/shared/StarRating";

const STALE_THRESHOLD_DAYS = 30;

export const Route = createFileRoute("/games/$slug")({
	component: GameDetailPage,
});

function GameDetailPage() {
	const { slug } = Route.useParams();
	const { isSignedIn } = useUser();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"reviews" | "articles">("reviews");
	const hasTriggeredRefresh = useRef(false);

	// Smart back navigation - goes back in history or falls back to /games
	const handleBack = useCallback(() => {
		// Check if we have history to go back to
		if (window.history.length > 1) {
			router.history.back();
		} else {
			router.navigate({ to: "/games" });
		}
	}, [router]);

	// Convex queries and actions
	const game = useQuery(api.games.getBySlug, { slug });
	const refreshGame = useAction(api.igdb.fetchBySlug);

	// Stale-while-revalidate: refresh game data if cached for too long
	useEffect(() => {
		if (!game || hasTriggeredRefresh.current) return;

		const cachedAt = game.cachedAt;
		const staleCutoff = Date.now() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

		if (cachedAt < staleCutoff) {
			hasTriggeredRefresh.current = true;
			refreshGame({ slug }).catch((err) => {
				console.error("Failed to refresh game data:", err);
			});
		}
	}, [game, slug, refreshGame]);
	const reviewsData = useQuery(
		api.reviews.getByGame,
		game ? { gameId: game._id, limit: 20 } : "skip",
	);
	const articlesData = useQuery(
		api.articles.getByGame,
		game ? { gameId: game._id } : "skip",
	);
	const ratingInfo = useQuery(
		api.questlog.getCombinedRating,
		game ? { gameId: game._id } : "skip",
	);

	const isLoading = game === undefined;
	const reviews = reviewsData?.reviews ?? [];
	const articles = articlesData ?? [];

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!game) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-white mb-2">Game Not Found</h1>
					<Link to="/games" className="text-purple-400 hover:underline">
						Back to Games
					</Link>
				</div>
			</div>
		);
	}

	const year = game.releaseDate
		? new Date(game.releaseDate).getFullYear()
		: null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			{/* Hero */}
			<div className="relative">
				<div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900" />
				<div className="container mx-auto px-4 py-8">
					<button
						type="button"
						onClick={handleBack}
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors relative z-10"
					>
						<ArrowLeft size={20} />
						Back
					</button>

					<div className="flex flex-col md:flex-row gap-8 relative z-10">
						{/* Cover */}
						<div className="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
							<div className="aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
								{game.coverUrl ? (
									<img
										src={game.coverUrl}
										alt={game.name}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center">
										<Gamepad2 className="w-16 h-16 text-gray-600" />
									</div>
								)}
							</div>
						</div>

						{/* Info */}
						<div className="flex-1">
							<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
								{game.name}
							</h1>

							<div className="flex flex-wrap items-center gap-4 mb-4">
								{year && (
									<span className="flex items-center gap-1 text-gray-400">
										<Calendar size={16} />
										{year}
									</span>
								)}
								{ratingInfo && ratingInfo.totalRatings > 0 && (
									<StarRatingDisplay
										rating={ratingInfo.averageRating ?? 0}
										reviewCount={ratingInfo.totalRatings}
									/>
								)}
							</div>

							{game.genres.length > 0 && (
								<div className="flex flex-wrap gap-2 mb-4">
									{game.genres.map((genre) => (
										<span
											key={genre}
											className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
										>
											{genre}
										</span>
									))}
								</div>
							)}

							{game.summary && (
								<p className="text-gray-400 leading-relaxed mb-6">
									{game.summary}
								</p>
							)}

							{isSignedIn && (
								<div className="flex flex-wrap gap-3">
									<QuestLogButton
										gameId={game._id}
										gameName={game.name}
										gamePlatforms={game.platforms}
									/>
									<CollectionButton
										gameId={game._id}
										gameName={game.name}
										gamePlatforms={game.platforms}
										categoryLabel={game.categoryLabel}
									/>
									<Link
										to="/reviews/new"
										search={{ gameId: game._id, draftId: undefined }}
										className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all border border-gray-700"
									>
										<Star size={20} />
										Write a Review
									</Link>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="container mx-auto px-4 py-8">
				<div className="flex gap-2 mb-6">
					<button
						type="button"
						onClick={() => setActiveTab("reviews")}
						className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${
							activeTab === "reviews"
								? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
								: "bg-gray-800/50 text-gray-400 hover:text-white"
						}`}
					>
						<Star size={18} />
						Reviews ({reviews.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("articles")}
						className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${
							activeTab === "articles"
								? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
								: "bg-gray-800/50 text-gray-400 hover:text-white"
						}`}
					>
						<FileText size={18} />
						Articles ({articles.length})
					</button>
				</div>

				{/* Content */}
				{activeTab === "reviews" && (
					<div className="space-y-4">
						{reviews.length > 0 ? (
							reviews.map((review) => (
								<ReviewCard
									key={review._id}
									review={{
										id: review._id,
										title: review.title,
										content: review.content,
										rating: review.rating,
										coverImageUrl: review.coverImageUrl,
										containsSpoilers: review.containsSpoilers,
										createdAt: new Date(review._creationTime),
										author: {
											id: review.author?._id ?? "",
											username: review.author?.username ?? "",
											displayName: review.author?.displayName ?? null,
											avatarUrl: review.author?.avatarUrl ?? null,
										},
										game: {
											id: game._id,
											name: game.name,
											slug: game.slug,
											coverUrl: game.coverUrl ?? null,
										},
										_count: review._count,
									}}
									isAuthenticated={isSignedIn}
								/>
							))
						) : (
							<div className="text-center py-12 text-gray-500">
								No reviews yet. Be the first to review this game!
							</div>
						)}
					</div>
				)}

				{activeTab === "articles" && (
					<div className="space-y-4">
						{articles.length > 0 ? (
							articles
								.filter((a) => a._id)
								.map((article) => (
									<Link
										key={article._id}
										to="/articles/$id"
										params={{ id: article._id as string }}
										className="block bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-colors"
									>
										<h3 className="text-lg font-semibold text-white hover:text-purple-400">
											{article.title}
										</h3>
										<p className="text-sm text-gray-400 mt-1">
											by{" "}
											{article.author?.displayName || article.author?.username}
										</p>
									</Link>
								))
						) : (
							<div className="text-center py-12 text-gray-500">
								No articles about this game yet.
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
