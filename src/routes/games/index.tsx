import { createFileRoute } from "@tanstack/react-router";
import { Clock, Gamepad2, Search, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { GameCard } from "../../components/games/GameCard";
import {
	fetchPopularGames,
	fetchRecentGames,
	getGamesWithReviews,
	searchGames,
} from "../../lib/server/games";

export const Route = createFileRoute("/games/")({
	component: GamesPage,
});

function GamesPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Awaited<ReturnType<typeof searchGames>>
	>([]);
	const [popularGames, setPopularGames] = useState<
		Awaited<ReturnType<typeof fetchPopularGames>>
	>([]);
	const [recentGames, setRecentGames] = useState<
		Awaited<ReturnType<typeof fetchRecentGames>>
	>([]);
	const [reviewedGames, setReviewedGames] = useState<
		Awaited<ReturnType<typeof getGamesWithReviews>>["games"]
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"popular" | "recent" | "reviewed">(
		"popular",
	);

	// Load initial data
	useEffect(() => {
		const loadGames = async () => {
			setIsLoading(true);
			try {
				const [popular, recent, reviewed] = await Promise.all([
					fetchPopularGames({ data: 12 }),
					fetchRecentGames({ data: 12 }),
					getGamesWithReviews({ data: { limit: 12 } }),
				]);
				setPopularGames(popular);
				setRecentGames(recent);
				setReviewedGames(reviewed.games);
			} catch (error) {
				console.error("Failed to load games:", error);
			} finally {
				setIsLoading(false);
			}
		};
		loadGames();
	}, []);

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
					data: { query: searchQuery, limit: 20 },
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

	const tabs = [
		{ id: "popular", label: "Popular", icon: TrendingUp },
		{ id: "recent", label: "Recent", icon: Clock },
		{ id: "reviewed", label: "Community Picks", icon: Gamepad2 },
	] as const;

	const currentGames = searchQuery.trim()
		? searchResults
		: activeTab === "popular"
			? popularGames
			: activeTab === "recent"
				? recentGames
				: reviewedGames;

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

				{/* Tab Navigation (hidden when searching) */}
				{!searchQuery.trim() && (
					<div className="flex justify-center gap-2 mb-8">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${
									activeTab === tab.id
										? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
										: "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50"
								}`}
							>
								<tab.icon size={18} />
								{tab.label}
							</button>
						))}
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
