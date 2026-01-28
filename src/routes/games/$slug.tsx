import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, FileText, Gamepad2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { ReviewCard } from "../../components/reviews/ReviewCard";
import { StarRatingDisplay } from "../../components/shared/StarRating";
import { getArticlesByGame } from "../../lib/server/articles";
import { getGameBySlug } from "../../lib/server/games";
import {
	getGameAverageRating,
	getReviewsByGame,
} from "../../lib/server/reviews";

export const Route = createFileRoute("/games/$slug")({
	component: GameDetailPage,
});

function GameDetailPage() {
	const { slug } = Route.useParams();
	const { isSignedIn } = useUser();
	const [game, setGame] = useState<Awaited<
		ReturnType<typeof getGameBySlug>
	> | null>(null);
	const [reviews, setReviews] = useState<
		Awaited<ReturnType<typeof getReviewsByGame>>["reviews"]
	>([]);
	const [articles, setArticles] = useState<
		Awaited<ReturnType<typeof getArticlesByGame>>
	>([]);
	const [ratingInfo, setRatingInfo] = useState({
		averageRating: 0,
		reviewCount: 0,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"reviews" | "articles">("reviews");

	useEffect(() => {
		const loadGame = async () => {
			setIsLoading(true);
			try {
				const gameData = await getGameBySlug({ data: slug });
				if (gameData) {
					setGame(gameData);
					const [reviewsData, articlesData, ratingData] = await Promise.all([
						getReviewsByGame({ data: { gameId: gameData.id, limit: 20 } }),
						getArticlesByGame({ data: gameData.id }),
						getGameAverageRating({ data: gameData.id }),
					]);
					setReviews(reviewsData.reviews);
					setArticles(articlesData);
					setRatingInfo(ratingData);
				}
			} catch (error) {
				console.error("Failed to load game:", error);
			} finally {
				setIsLoading(false);
			}
		};
		loadGame();
	}, [slug]);

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
					<Link
						to="/games"
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors relative z-10"
					>
						<ArrowLeft size={20} />
						Back to Games
					</Link>

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
							<h1 className="text-4xl font-bold text-white mb-2">
								{game.name}
							</h1>

							<div className="flex flex-wrap items-center gap-4 mb-4">
								{year && (
									<span className="flex items-center gap-1 text-gray-400">
										<Calendar size={16} />
										{year}
									</span>
								)}
								{ratingInfo.reviewCount > 0 && (
									<StarRatingDisplay
										rating={ratingInfo.averageRating}
										reviewCount={ratingInfo.reviewCount}
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
								<Link
									to="/reviews/new"
									search={{ gameId: game.id }}
									className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all"
								>
									<Star size={20} />
									Write a Review
								</Link>
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
									key={review.id}
									review={{ ...review, game }}
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
							articles.map((article) => (
								<Link
									key={article.id}
									to="/articles/$id"
									params={{ id: article.id }}
									className="block bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-colors"
								>
									<h3 className="text-lg font-semibold text-white hover:text-purple-400">
										{article.title}
									</h3>
									<p className="text-sm text-gray-400 mt-1">
										by {article.author.displayName || article.author.username}
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
