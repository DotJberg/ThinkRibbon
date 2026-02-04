import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { Gamepad2, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameSearchResult } from "@/types/game";
import { api } from "../../../convex/_generated/api";
import { GameCard } from "../../components/games/GameCard";
import {
	GamesFeedSelector,
	type GamesFeedType,
} from "../../components/games/GamesFeedSelector";
import { UpcomingGamesGrid } from "../../components/games/UpcomingGamesGrid";

interface GamesSearchParams {
	q?: string;
	feed?: GamesFeedType;
}

export const Route = createFileRoute("/games/")({
	component: GamesPage,
	validateSearch: (search: Record<string, unknown>): GamesSearchParams => {
		return {
			q: typeof search.q === "string" ? search.q : undefined,
			feed: ["latest-reviewed", "highest-rated", "upcoming"].includes(
				search.feed as string,
			)
				? (search.feed as GamesFeedType)
				: undefined,
		};
	},
});

function GamesPage() {
	const navigate = useNavigate();
	const { q: searchQuery = "", feed: selectedFeed = "latest-reviewed" } =
		Route.useSearch();

	const [searchResults, setSearchResults] = useState<GameSearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Local state for input (to avoid URL update on every keystroke)
	const [inputValue, setInputValue] = useState(searchQuery);

	// Sync input value when URL changes (e.g., back button)
	useEffect(() => {
		setInputValue(searchQuery);
	}, [searchQuery]);

	// Debounced URL update for search
	useEffect(() => {
		const timeout = setTimeout(() => {
			if (inputValue !== searchQuery) {
				navigate({
					to: "/games",
					search: (prev) => ({
						...prev,
						q: inputValue || undefined,
					}),
				});
			}
		}, 300);

		return () => clearTimeout(timeout);
	}, [inputValue, searchQuery, navigate]);

	const setSelectedFeed = (feed: GamesFeedType) => {
		navigate({
			to: "/games",
			search: (prev) => ({
				...prev,
				feed: feed === "latest-reviewed" ? undefined : feed,
			}),
		});
	};

	// Convex queries
	const latestReviewedData = useQuery(api.games.getWithReviews, { limit: 12 });
	const highestRatedData = useQuery(api.games.getHighestRated, { limit: 12 });
	const upcomingData = useQuery(api.games.getUpcoming, { limitPerMonth: 6 });
	const searchAndCache = useAction(api.igdb.searchAndCache);
	const fetchUpcoming = useAction(api.igdb.fetchUpcoming);

	const latestReviewedGames = latestReviewedData?.games ?? [];
	const highestRatedGames = highestRatedData?.games ?? [];
	const upcomingGames = upcomingData?.games ?? [];
	const monthTotals = upcomingData?.monthTotals ?? {};

	const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(false);
	const [hasFetchedUpcoming, setHasFetchedUpcoming] = useState(false);

	// Fetch upcoming games from IGDB when tab is selected and we don't have many
	useEffect(() => {
		if (
			selectedFeed === "upcoming" &&
			!hasFetchedUpcoming &&
			!isLoadingUpcoming &&
			upcomingGames.length < 10
		) {
			setIsLoadingUpcoming(true);
			fetchUpcoming({ limit: 100 })
				.then(() => {
					setHasFetchedUpcoming(true);
				})
				.catch(console.error)
				.finally(() => {
					setIsLoadingUpcoming(false);
				});
		}
	}, [
		selectedFeed,
		hasFetchedUpcoming,
		isLoadingUpcoming,
		upcomingGames.length,
		fetchUpcoming,
	]);

	const isLoading =
		latestReviewedData === undefined || highestRatedData === undefined;

	// Handle search when URL query changes
	useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchResults([]);
			setIsSearching(false);
			return;
		}

		let cancelled = false;
		setIsSearching(true);

		searchAndCache({
			query: searchQuery,
			limit: 20,
		})
			.then((results) => {
				if (!cancelled) {
					setSearchResults(results);
				}
			})
			.catch((error) => {
				console.error("Search failed:", error);
			})
			.finally(() => {
				if (!cancelled) {
					setIsSearching(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [searchQuery, searchAndCache]);

	const currentGames = searchQuery.trim()
		? searchResults.map((g) => ({
				id: g._id,
				name: g.name,
				slug: g.slug,
				coverUrl: g.coverUrl ?? null,
				genres: g.genres,
				releaseDate: g.releaseDate ? new Date(g.releaseDate) : null,
				categoryLabel: g.categoryLabel,
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
					categoryLabel: g.categoryLabel,
				}))
			: selectedFeed === "highest-rated"
				? highestRatedGames.map((g) => ({
						id: g._id,
						name: g.name,
						slug: g.slug,
						coverUrl: g.coverUrl ?? null,
						genres: g.genres,
						releaseDate: g.releaseDate ? new Date(g.releaseDate) : null,
						_count: g._count,
						averageRating: g.averageRating,
						categoryLabel: g.categoryLabel,
					}))
				: []; // Upcoming uses a different component

	const upcomingGamesFormatted = upcomingGames
		.filter((g) => g.releaseDate)
		.map((g) => ({
			id: g._id,
			name: g.name,
			slug: g.slug,
			coverUrl: g.coverUrl ?? null,
			genres: g.genres,
			releaseDate: new Date(g.releaseDate!),
			categoryLabel: g.categoryLabel,
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
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
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
				{selectedFeed === "upcoming" && !searchQuery.trim() ? (
					// Upcoming games view
					isLoadingUpcoming && upcomingGamesFormatted.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
							<p className="text-gray-400">Loading upcoming games...</p>
						</div>
					) : (
						<UpcomingGamesGrid
							games={upcomingGamesFormatted}
							monthTotals={monthTotals}
						/>
					)
				) : isLoading ? (
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
