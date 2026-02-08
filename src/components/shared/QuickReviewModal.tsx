import { useUser } from "@clerk/clerk-react";
import { useAction, useMutation } from "convex/react";
import { Loader2, Search, Star, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameSearchResult } from "@/types/game";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface QuickReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function QuickReviewModal({ isOpen, onClose }: QuickReviewModalProps) {
	const { user } = useUser();
	const searchGamesAction = useAction(api.igdb.searchAndCache);
	const quickRateMutation = useMutation(api.questlog.quickRate);

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<GameSearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(
		null,
	);
	const [rating, setRating] = useState(0);
	const [hoveredStar, setHoveredStar] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (isOpen && !selectedGame && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen, selectedGame]);

	const performSearch = useCallback(
		async (searchQuery: string) => {
			if (!searchQuery.trim()) {
				setResults([]);
				return;
			}
			setIsSearching(true);
			try {
				const data = await searchGamesAction({ query: searchQuery });
				setResults(data as GameSearchResult[]);
			} catch (error) {
				console.error("Search failed:", error);
				setResults([]);
			} finally {
				setIsSearching(false);
			}
		},
		[searchGamesAction],
	);

	const handleQueryChange = (value: string) => {
		setQuery(value);
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			performSearch(value);
		}, 300);
	};

	const handleClose = () => {
		setQuery("");
		setResults([]);
		setSelectedGame(null);
		setRating(0);
		setHoveredStar(0);
		onClose();
	};

	const handleBack = () => {
		setSelectedGame(null);
		setRating(0);
		setHoveredStar(0);
	};

	const handleSubmit = async () => {
		if (!selectedGame || !user?.id || rating === 0) return;
		setIsSubmitting(true);
		try {
			await quickRateMutation({
				clerkId: user.id,
				gameId: selectedGame._id as Id<"games">,
				quickRating: rating,
			});
			handleClose();
		} catch (error) {
			console.error("Quick rate failed:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-lg max-h-[80vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-800">
					<div className="flex items-center gap-2">
						<Zap size={18} className="text-yellow-400" />
						<h2 className="text-lg font-bold text-white">Quick Review</h2>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
					>
						<X size={18} />
					</button>
				</div>

				{!selectedGame ? (
					<>
						{/* Search Input */}
						<div className="p-5 border-b border-gray-800">
							<div className="relative">
								<Search
									size={18}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
								/>
								<input
									ref={inputRef}
									type="text"
									value={query}
									onChange={(e) => handleQueryChange(e.target.value)}
									placeholder="Search for a game..."
									className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
								/>
								{isSearching && (
									<Loader2
										size={18}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin"
									/>
								)}
							</div>
						</div>

						{/* Results */}
						<div className="flex-1 overflow-y-auto p-2">
							{!query.trim() ? (
								<div className="text-center py-8 text-gray-500">
									<Search size={32} className="mx-auto mb-2 opacity-50" />
									<p>Search for a game to rate</p>
								</div>
							) : results.length === 0 && !isSearching ? (
								<div className="text-center py-8 text-gray-500">
									<p>No games found for "{query}"</p>
								</div>
							) : (
								<div className="space-y-2">
									{results.map((game) => (
										<button
											key={game._id}
											type="button"
											onClick={() => setSelectedGame(game)}
											className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/50 rounded-xl transition-all text-left group"
										>
											<div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
												{game.coverUrl ? (
													<img
														src={game.coverUrl}
														alt={game.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
														No Image
													</div>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<h3 className="font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
														{game.name}
													</h3>
													{game.categoryLabel && (
														<span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-600/80 rounded text-xs font-medium text-white">
															{game.categoryLabel}
														</span>
													)}
												</div>
												{game.releaseDate && (
													<p className="text-sm text-gray-500">
														{new Date(game.releaseDate).getFullYear()}
													</p>
												)}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</>
				) : (
					/* Rating Step */
					<div className="p-5 flex flex-col items-center gap-6">
						{/* Selected Game */}
						<div className="flex items-center gap-3 w-full">
							<div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
								{selectedGame.coverUrl ? (
									<img
										src={selectedGame.coverUrl}
										alt={selectedGame.name}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
										No Image
									</div>
								)}
							</div>
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-white truncate">
									{selectedGame.name}
								</h3>
								{selectedGame.releaseDate && (
									<p className="text-sm text-gray-500">
										{new Date(selectedGame.releaseDate).getFullYear()}
									</p>
								)}
							</div>
							<button
								type="button"
								onClick={handleBack}
								className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
							>
								Change
							</button>
						</div>

						{/* Star Rating */}
						<div className="flex flex-col items-center gap-3">
							<p className="text-sm text-gray-400">How would you rate it?</p>
							<div className="flex gap-1">
								{[1, 2, 3, 4, 5].map((star) => (
									<button
										key={star}
										type="button"
										onClick={() => setRating(star)}
										onMouseEnter={() => setHoveredStar(star)}
										onMouseLeave={() => setHoveredStar(0)}
										className="p-1 transition-transform hover:scale-110"
									>
										<Star
											size={32}
											className={
												star <= (hoveredStar || rating)
													? "text-yellow-400 fill-yellow-400"
													: "text-gray-600"
											}
										/>
									</button>
								))}
							</div>
						</div>

						{/* Submit */}
						<button
							type="button"
							onClick={handleSubmit}
							disabled={rating === 0 || isSubmitting}
							className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
						>
							{isSubmitting ? (
								<>
									<Loader2 size={16} className="animate-spin" />
									Saving...
								</>
							) : (
								"Rate"
							)}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
