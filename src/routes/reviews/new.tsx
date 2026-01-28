import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gamepad2, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { StarRating } from "../../components/shared/StarRating";
import { searchGames } from "../../lib/server/games";
import { createReview } from "../../lib/server/reviews";

export const Route = createFileRoute("/reviews/new")({
	component: NewReviewPage,
	validateSearch: (search: Record<string, unknown>) => ({
		gameId: search.gameId as string | undefined,
	}),
});

function NewReviewPage() {
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const { gameId } = Route.useSearch();
	const id = useId();

	const [selectedGame, setSelectedGame] = useState<{
		id: string;
		name: string;
		coverUrl: string | null;
	} | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Awaited<ReturnType<typeof searchGames>>
	>([]);
	const [isSearching, setIsSearching] = useState(false);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [rating, setRating] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Load pre-selected game
	useEffect(() => {
		if (gameId) {
			// We'd need to fetch the game by ID - for now just show the form
		}
	}, [gameId]);

	// Handle search
	useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchResults([]);
			return;
		}

		const timeoutId = setTimeout(async () => {
			setIsSearching(true);
			try {
				const results = await searchGames({
					data: { query: searchQuery, limit: 5 },
				});
				setSearchResults(results);
			} catch (error) {
				console.error("Search failed:", error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!user ||
			!selectedGame ||
			!title.trim() ||
			!content.trim() ||
			rating === 0
		)
			return;

		setIsSubmitting(true);
		try {
			const review = await createReview({
				data: {
					title,
					content,
					rating,
					gameId: selectedGame.id,
					published: true,
					authorClerkId: user.id,
				},
			});
			navigate({ to: "/reviews/$id", params: { id: review.id } });
		} catch (error) {
			console.error("Failed to create review:", error);
			alert(
				"Failed to create review. You may have already reviewed this game.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Sign in to write a review
					</h1>
					<Link to="/sign-in" className="text-purple-400 hover:underline">
						Sign In
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8 max-w-3xl">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					Back
				</Link>

				<h1 className="text-3xl font-bold text-white mb-8">Write a Review</h1>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Game Selection */}
					{!selectedGame ? (
						<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
							<label
								htmlFor={`${id}-game-search`}
								className="block text-sm font-medium text-gray-300 mb-4"
							>
								Select a Game
							</label>
							<div className="relative">
								<Search
									className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 ${isSearching ? "animate-pulse" : ""}`}
									size={20}
								/>
								<input
									id={`${id}-game-search`}
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search for a game..."
									className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
								/>
							</div>

							{/* Search Results */}
							{searchResults.length > 0 && (
								<div className="mt-4 space-y-2">
									{searchResults.map((game) => (
										<button
											key={game.id}
											type="button"
											onClick={() => {
												setSelectedGame({
													id: game.id,
													name: game.name,
													coverUrl: game.coverUrl,
												});
												setSearchQuery("");
												setSearchResults([]);
											}}
											className="w-full flex items-center gap-3 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
										>
											{game.coverUrl ? (
												<img
													src={game.coverUrl}
													alt=""
													className="w-10 h-14 object-cover rounded"
												/>
											) : (
												<Gamepad2 className="w-10 h-14 text-gray-500" />
											)}
											<span className="text-white font-medium">
												{game.name}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					) : (
						<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4">
							{selectedGame.coverUrl ? (
								<img
									src={selectedGame.coverUrl}
									alt=""
									className="w-16 h-20 object-cover rounded"
								/>
							) : (
								<div className="w-16 h-20 bg-gray-700 rounded flex items-center justify-center">
									<Gamepad2 className="w-8 h-8 text-gray-500" />
								</div>
							)}
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-white">
									{selectedGame.name}
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setSelectedGame(null)}
								className="text-gray-400 hover:text-white"
							>
								Change
							</button>
						</div>
					)}

					{/* Rating */}
					<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
						<span className="block text-sm font-medium text-gray-300 mb-4">
							Your Rating
						</span>
						<StarRating
							rating={rating}
							size="lg"
							interactive
							onChange={setRating}
						/>
					</div>

					{/* Title */}
					<div>
						<label
							htmlFor={`${id}-title`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Review Title
						</label>
						<input
							id={`${id}-title`}
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Give your review a title..."
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
							required
						/>
					</div>

					{/* Content */}
					<div>
						<label
							htmlFor={`${id}-content`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Your Review
						</label>
						<textarea
							id={`${id}-content`}
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Write your thoughts about this game..."
							rows={10}
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 resize-none"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || !selectedGame || rating === 0}
						className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? "Publishing..." : "Publish Review"}
					</button>
				</form>
			</div>
		</div>
	);
}
