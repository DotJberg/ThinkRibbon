import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { Gamepad2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { GameCard } from "../../components/games/GameCard";
import {
	GamesFeedSelector,
	type GamesFeedType,
} from "../../components/games/GamesFeedSelector";

export const Route = createFileRoute("/games/")({
	component: GamesPage,
});

function GamesPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Array<{
			_id: string;
			name: string;
			slug: string;
			coverUrl?: string;
			genres: string[];
			releaseDate?: number;
		}>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedFeed, setSelectedFeed] =
		useState<GamesFeedType>("latest-reviewed");

	// Convex queries
	const latestReviewedData = useQuery(api.games.getWithReviews, { limit: 12 });
	const highestRatedData = useQuery(api.games.getHighestRated, { limit: 12 });
	const searchAndCache = useAction(api.igdb.searchAndCache);

	const latestReviewedGames = latestReviewedData?.games ?? [];
	const highestRatedGames = highestRatedData?.games ?? [];
	const isLoading =
		latestReviewedData === undefined || highestRatedData === undefined;

	// Handle search
	useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchResults([]);
			return;
		}

		const timeoutId = setTimeout(async () => {
			setIsSearching(true);
			try {
				const results = await searchAndCache({
					query: searchQuery,
					limit: 20,
				});
				setSearchResults(results);
			} catch (error) {
				console.error("Search failed:", error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery, searchAndCache]);

	const currentGames = searchQuery.trim()
		? searchResults.map((g) => ({
				id: g._id,
				name: g.name,
				slug: g.slug,
				coverUrl: g.coverUrl ?? null,
				genres: g.genres,
				releaseDate: g.releaseDate ? new Date(g.releaseDate) : null,
			}))
		: selectedFeed === "latest-reviewed"
			? latestReviewedGames.map((g) => ({
					id: g._id,
					name: g.name,
					slug: g.slug,
					coverUrl: g.coverUrl ?? null,
					genres: g.genres,
					releaseDate: g.releaseDate ? new Date(g.releaseDate) : null,
					_count: g._count,
					averageRating: g.averageRating,
				}))
			: highestRatedGames.map((g) => ({
					id: g._id,
					name: g.name,
					slug: g.slug,
					coverUrl: g.coverUrl ?? null,
					genres: g.genres,
					releaseDate: g.releaseDate ? new Date(g.releaseDate) : null,
					_count: g._count,
					averageRating: g.averageRating,
				}));

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-white mb-4">Browse Games</h1>
					<p className="text-gray-400">Discover games to review and discuss</p>
				</div>

				{/* Search */}
				<div className="max-w-xl mx-auto mb-8">
					<div className="relative">
						<Search
							className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search for games..."
							className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
						/>
						{isSearching && (
							<div className="absolute right-4 top-1/2 -translate-y-1/2">
								<div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
							</div>
						)}
					</div>
				</div>

				{/* Feed Selector (hidden when searching) */}
				{!searchQuery.trim() && (
					<div className="flex justify-center mb-8">
						<GamesFeedSelector
							selectedFeed={selectedFeed}
							onFeedChange={setSelectedFeed}
						/>
					</div>
				)}

				{/* Results */}
				{isLoading ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
						{[...Array(12)].map((_, i) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader
								key={i}
								className="bg-gray-800/50 rounded-xl aspect-[3/4] animate-pulse"
							/>
						))}
					</div>
				) : currentGames.length > 0 ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
						{currentGames.map((game) => (
							<GameCard key={game.id} game={game} />
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
						<p className="text-gray-500">
							{searchQuery.trim()
								? `No games found for "${searchQuery}"`
								: "No games to display"}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
