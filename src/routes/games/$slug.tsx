import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import {
	ArrowLeft,
	Calendar,
	ChevronLeft,
	ChevronRight,
	FileText,
	Gamepad2,
	Play,
	Star,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CollectionButton } from "../../components/collection/CollectionButton";
import { GameCard } from "../../components/games/GameCard";
import { QuestLogButton } from "../../components/questlog/QuestLogButton";
import { ReviewCard } from "../../components/reviews/ReviewCard";
import { StarRatingDisplay } from "../../components/shared/StarRating";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "../../components/ui/carousel";
import { getConvexClient } from "../../lib/convex-server";
import { buildIgdbImageUrl } from "../../lib/igdb-images";
import { buildMeta, seoTitle, seoUrl, truncate } from "../../lib/seo";

const STALE_THRESHOLD_DAYS = 30;

export const Route = createFileRoute("/games/$slug")({
	loader: async ({ params }) => {
		try {
			const client = getConvexClient();
			const game = await client.query(api.games.getBySlug, {
				slug: params.slug,
			});
			return { game };
		} catch {
			return { game: null };
		}
	},
	head: ({ loaderData }) => {
		const game = loaderData?.game;
		if (!game) return {};
		const year = game.releaseDate
			? new Date(game.releaseDate).getFullYear()
			: null;
		const title = year
			? seoTitle(`${game.name} (${year})`)
			: seoTitle(game.name);
		const description = game.summary
			? truncate(game.summary)
			: `Explore ${game.name} on Think Ribbon — reviews, articles, and community discussion.`;
		return {
			meta: buildMeta({
				title,
				description,
				url: seoUrl(`/games/${game.slug}`),
				image: game.coverUrl,
				type: "website",
			}),
		};
	},
	component: GameDetailPage,
});

function GameDetailPage() {
	const { slug } = Route.useParams();
	const { isSignedIn } = useUser();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"reviews" | "articles">("reviews");
	const hasTriggeredRefresh = useRef(false);
	const hasTriggeredSimilarFetch = useRef(false);

	// Lightbox & modal state
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [selectedVideo, setSelectedVideo] = useState<{
		name: string;
		videoId: string;
	} | null>(null);

	// Smart back navigation - goes back in history or falls back to /games
	const handleBack = useCallback(() => {
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
	// or if detail fields (added later) are missing
	useEffect(() => {
		if (!game || hasTriggeredRefresh.current) return;

		const cachedAt = game.cachedAt;
		const staleCutoff = Date.now() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
		const missingDetailFields = game.developers === undefined;

		if (cachedAt < staleCutoff || missingDetailFields) {
			hasTriggeredRefresh.current = true;
			refreshGame({ slug }).catch((err) => {
				console.error("Failed to refresh game data:", err);
			});
		}
	}, [game, slug, refreshGame]);

	// Similar games
	const similarIgdbIds = game?.similarGameIgdbIds;
	const similarGamesFromCache = useQuery(
		api.games.getByIgdbIds,
		similarIgdbIds && similarIgdbIds.length > 0
			? { igdbIds: similarIgdbIds.slice(0, 5) }
			: "skip",
	);
	const fetchSimilarGames = useAction(api.igdb.fetchSimilarGames);

	// Fetch uncached similar games once
	useEffect(() => {
		if (
			!similarIgdbIds ||
			similarIgdbIds.length === 0 ||
			hasTriggeredSimilarFetch.current
		)
			return;
		if (similarGamesFromCache === undefined) return; // still loading

		const cachedIds = new Set(similarGamesFromCache.map((g) => g.igdbId));
		const uncachedIds = similarIgdbIds
			.slice(0, 5)
			.filter((id) => !cachedIds.has(id));

		if (uncachedIds.length > 0) {
			hasTriggeredSimilarFetch.current = true;
			fetchSimilarGames({ igdbIds: uncachedIds }).catch((err) => {
				console.error("Failed to fetch similar games:", err);
			});
		}
	}, [similarIgdbIds, similarGamesFromCache, fetchSimilarGames]);

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

	// Combine screenshots + artworks into a single gallery
	const allImages = useMemo(() => {
		if (!game) return [];
		const images: string[] = [];
		if (game.screenshots) images.push(...game.screenshots);
		if (game.artworks) images.push(...game.artworks);
		return images;
	}, [game]);

	const isLoading = game === undefined;
	const reviews = reviewsData?.reviews ?? [];
	const articles = articlesData ?? [];

	// Hero backdrop image — first artwork, fallback to first screenshot
	const backdropImageId = game?.artworks?.[0] ?? game?.screenshots?.[0] ?? null;

	// Developer/publisher display
	const developers = game?.developers?.length ? game.developers : null;
	const publishers = game?.publishers?.length ? game.publishers : null;
	const hasCompanyInfo = developers || publishers;

	// Videos
	const videos = game?.videos?.length ? game.videos : null;

	// Platforms
	const platforms = game?.platforms?.length ? game.platforms : null;

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!game) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="text-center">
					<Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-white mb-2">Game Not Found</h1>
					<Link to="/games" className="text-slate-400 hover:underline">
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
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20">
			{/* Hero */}
			<div className="relative overflow-hidden">
				{/* Backdrop artwork */}
				{backdropImageId && (
					<div className="absolute inset-0">
						<img
							src={buildIgdbImageUrl(backdropImageId, "720p")}
							alt=""
							className="w-full h-full object-cover scale-110 blur-sm"
						/>
						<div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/80 to-gray-900" />
					</div>
				)}
				{!backdropImageId && (
					<div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900" />
				)}

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
								<div className="flex flex-wrap gap-2 mb-3">
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

							{/* Platforms */}
							{platforms && (
								<div className="flex flex-wrap gap-2 mb-4">
									{platforms.map((platform) => (
										<span
											key={platform}
											className="px-2.5 py-0.5 bg-slate-700/60 rounded-full text-xs text-slate-300 border border-slate-600/30"
										>
											{platform}
										</span>
									))}
								</div>
							)}

							{/* Developer / Publisher */}
							{hasCompanyInfo && (
								<p className="text-sm text-gray-500 mb-4">
									{developers && (
										<span>
											Developed by{" "}
											<span className="text-gray-400">
												{developers.join(", ")}
											</span>
										</span>
									)}
									{developers && publishers && (
										<span className="mx-2 text-gray-600">&middot;</span>
									)}
									{publishers && (
										<span>
											Published by{" "}
											<span className="text-gray-400">
												{publishers.join(", ")}
											</span>
										</span>
									)}
								</p>
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

			{/* Videos */}
			{videos && (
				<div className="container mx-auto px-4 pt-8">
					<h2 className="text-lg font-semibold text-white mb-4">
						Trailers & Videos
					</h2>
					<Carousel opts={{ align: "start", loop: true }} className="w-full">
						<CarouselContent className="-ml-3">
							{videos.map((video) => (
								<CarouselItem
									key={video.videoId}
									className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3"
								>
									<button
										type="button"
										onClick={() => setSelectedVideo(video)}
										className="w-full group/vid relative rounded-lg overflow-hidden"
									>
										<img
											src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
											alt={video.name}
											loading="lazy"
											className="w-full aspect-video object-cover"
										/>
										<div className="absolute inset-0 bg-black/30 group-hover/vid:bg-black/10 transition-colors flex items-center justify-center">
											<div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover/vid:bg-white/30 group-hover/vid:scale-110 transition-all">
												<Play
													size={20}
													className="text-white fill-white ml-0.5"
												/>
											</div>
										</div>
										<div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
											<p className="text-xs text-gray-200 truncate">
												{video.name}
											</p>
										</div>
									</button>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="left-2 bg-black/60 border-gray-700 text-white hover:bg-black/80 hover:text-white disabled:opacity-0" />
						<CarouselNext className="right-2 bg-black/60 border-gray-700 text-white hover:bg-black/80 hover:text-white disabled:opacity-0" />
					</Carousel>
				</div>
			)}

			{/* Screenshots Carousel */}
			{allImages.length > 0 && (
				<div className="container mx-auto px-4 pt-8">
					<h2 className="text-lg font-semibold text-white mb-4">Screenshots</h2>
					<Carousel opts={{ align: "start", loop: true }} className="w-full">
						<CarouselContent className="-ml-3">
							{allImages.map((imageId, index) => (
								<CarouselItem
									key={imageId}
									className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3"
								>
									<button
										type="button"
										onClick={() => setLightboxIndex(index)}
										className="group/ss w-full rounded-lg overflow-hidden aspect-video bg-gray-800"
									>
										<img
											src={buildIgdbImageUrl(imageId, "screenshot_big")}
											alt={`Screenshot ${index + 1}`}
											loading="lazy"
											className="w-full h-full object-cover group-hover/ss:scale-105 transition-transform duration-300"
										/>
									</button>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="left-2 bg-black/60 border-gray-700 text-white hover:bg-black/80 hover:text-white disabled:opacity-0" />
						<CarouselNext className="right-2 bg-black/60 border-gray-700 text-white hover:bg-black/80 hover:text-white disabled:opacity-0" />
					</Carousel>
				</div>
			)}

			{/* Tabs */}
			<div className="container mx-auto px-4 py-8">
				<div className="flex gap-2 mb-6">
					<button
						type="button"
						onClick={() => setActiveTab("reviews")}
						className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${
							activeTab === "reviews"
								? "bg-gradient-to-r from-slate-700 to-slate-600 text-white"
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
								? "bg-gradient-to-r from-slate-700 to-slate-600 text-white"
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
										<h3 className="text-lg font-semibold text-white hover:text-slate-400">
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

			{/* Similar Games */}
			{similarGamesFromCache && similarGamesFromCache.length > 0 && (
				<div className="container mx-auto px-4 pb-12">
					<h2 className="text-lg font-semibold text-white mb-4">
						Similar Games
					</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
						{similarGamesFromCache.map((sg) => (
							<GameCard
								key={sg._id}
								game={{
									id: sg._id,
									name: sg.name,
									slug: sg.slug,
									coverUrl: sg.coverUrl ?? null,
									genres: sg.genres,
									releaseDate: sg.releaseDate ? new Date(sg.releaseDate) : null,
									categoryLabel: sg.categoryLabel,
								}}
							/>
						))}
					</div>
				</div>
			)}

			{/* Similar Games loading skeletons */}
			{similarIgdbIds &&
				similarIgdbIds.length > 0 &&
				similarGamesFromCache === undefined && (
					<div className="container mx-auto px-4 pb-12">
						<h2 className="text-lg font-semibold text-white mb-4">
							Similar Games
						</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{["a", "b", "c", "d", "e"].map((key) => (
								<div key={key}>
									<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
										<div className="aspect-[3/4] bg-gray-700 animate-pulse" />
										<div className="p-3 space-y-2">
											<div className="h-4 bg-gray-700 rounded animate-pulse" />
											<div className="h-3 bg-gray-700/50 rounded w-2/3 animate-pulse" />
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

			{/* Screenshot Lightbox */}
			{lightboxIndex !== null && allImages.length > 0 && (
				<div
					role="dialog"
					aria-label="Screenshot viewer"
					className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
					onClick={() => setLightboxIndex(null)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setLightboxIndex(null);
						if (e.key === "ArrowLeft")
							setLightboxIndex((prev) =>
								prev !== null
									? (prev - 1 + allImages.length) % allImages.length
									: null,
							);
						if (e.key === "ArrowRight")
							setLightboxIndex((prev) =>
								prev !== null ? (prev + 1) % allImages.length : null,
							);
					}}
				>
					<button
						type="button"
						onClick={() => setLightboxIndex(null)}
						className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
					>
						<X size={24} />
					</button>

					{allImages.length > 1 && (
						<>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setLightboxIndex((prev) =>
										prev !== null
											? (prev - 1 + allImages.length) % allImages.length
											: null,
									);
								}}
								className="absolute left-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
							>
								<ChevronLeft size={32} />
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setLightboxIndex((prev) =>
										prev !== null ? (prev + 1) % allImages.length : null,
									);
								}}
								className="absolute right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
							>
								<ChevronRight size={32} />
							</button>
						</>
					)}

					{/* biome-ignore lint/a11y/useKeyWithClickEvents: key events handled on parent dialog */}
					<img
						src={buildIgdbImageUrl(allImages[lightboxIndex], "screenshot_huge")}
						alt={`Screenshot ${lightboxIndex + 1}`}
						className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
						onClick={(e) => e.stopPropagation()}
					/>

					<div className="absolute bottom-4 text-gray-500 text-sm">
						{lightboxIndex + 1} / {allImages.length}
					</div>
				</div>
			)}

			{/* Video Modal */}
			{selectedVideo && (
				<div
					role="dialog"
					aria-label="Video player"
					className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
					onClick={() => setSelectedVideo(null)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setSelectedVideo(null);
					}}
				>
					<button
						type="button"
						onClick={() => setSelectedVideo(null)}
						className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
					>
						<X size={24} />
					</button>

					{/* biome-ignore lint/a11y/useKeyWithClickEvents: key events handled on parent dialog */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation wrapper for iframe */}
					<div
						className="w-full max-w-4xl aspect-video"
						onClick={(e) => e.stopPropagation()}
					>
						<iframe
							src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
							title={selectedVideo.name}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							className="w-full h-full rounded-lg"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
