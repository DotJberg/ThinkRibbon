import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatMonthYearFromNumbers, parseMonthParam } from "@/lib/date-utils";
import type { GameSearchResult } from "@/types/game";
import { api } from "../../../convex/_generated/api";
import { UpcomingGameCard } from "../../components/games/UpcomingGameCard";

export const Route = createFileRoute("/games/upcoming/$month")({
	component: UpcomingMonthPage,
});

function UpcomingMonthPage() {
	const { month } = Route.useParams();
	const parsed = parseMonthParam(month);

	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [allGames, setAllGames] = useState<GameSearchResult[]>([]);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasFetchedFromIgdb, setHasFetchedFromIgdb] = useState(false);

	// Query for games in this month
	const data = useQuery(
		api.games.getUpcomingByMonth,
		parsed
			? {
					year: parsed.year,
					month: parsed.month,
					limit: 20,
					cursor,
				}
			: "skip",
	);

	const fetchFromIgdb = useAction(api.igdb.fetchUpcomingByMonth);

	// Fetch from IGDB if we don't have many games
	useEffect(() => {
		if (parsed && !hasFetchedFromIgdb && data && data.games.length < 10) {
			setHasFetchedFromIgdb(true);
			fetchFromIgdb({
				year: parsed.year,
				month: parsed.month,
				limit: 50,
			}).catch(console.error);
		}
	}, [parsed, hasFetchedFromIgdb, data, fetchFromIgdb]);

	// Accumulate games as we paginate
	useEffect(() => {
		if (data?.games) {
			if (cursor) {
				// Append new games
				setAllGames((prev) => {
					const existingIds = new Set(prev.map((g) => g._id));
					const newGames = data.games.filter((g) => !existingIds.has(g._id));
					return [...prev, ...newGames];
				});
			} else {
				// Initial load
				setAllGames(data.games);
			}
			setIsLoadingMore(false);
		}
	}, [data, cursor]);

	// Infinite scroll handler
	const handleScroll = useCallback(() => {
		if (isLoadingMore || !data?.nextCursor) return;

		const scrollTop = window.scrollY;
		const windowHeight = window.innerHeight;
		const documentHeight = document.documentElement.scrollHeight;

		if (scrollTop + windowHeight >= documentHeight - 500) {
			setIsLoadingMore(true);
			setCursor(data.nextCursor);
		}
	}, [isLoadingMore, data?.nextCursor]);

	useEffect(() => {
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	if (!parsed) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
				<div className="container mx-auto px-4 py-8 text-center">
					<p className="text-gray-400">Invalid month format</p>
					<Link
						to="/games"
						className="text-purple-400 hover:text-purple-300 mt-4 inline-block"
					>
						Back to Games
					</Link>
				</div>
			</div>
		);
	}

	const monthLabel = formatMonthYearFromNumbers(parsed.year, parsed.month);
	const isLoading = data === undefined;

	const formattedGames = allGames
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
				<div className="mb-8">
					<Link
						to="/games"
						search={{ feed: "upcoming" }}
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
					>
						<ArrowLeft size={20} />
						Back to Upcoming Games
					</Link>

					<div className="flex items-center gap-4">
						<div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl">
							<Calendar size={24} className="text-purple-400" />
							<h1 className="text-2xl font-bold text-white">{monthLabel}</h1>
						</div>
						{data && (
							<span className="text-gray-400">
								{data.total} game{data.total !== 1 ? "s" : ""} releasing
							</span>
						)}
					</div>
				</div>

				{/* Games Grid */}
				{isLoading ? (
					<div className="flex flex-col items-center justify-center py-12">
						<Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
						<p className="text-gray-400">Loading games...</p>
					</div>
				) : formattedGames.length > 0 ? (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{formattedGames.map((game) => (
								<UpcomingGameCard key={game.id} game={game} />
							))}
						</div>

						{/* Loading more indicator */}
						{isLoadingMore && (
							<div className="flex justify-center py-8">
								<Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
							</div>
						)}

						{/* End of list */}
						{!data?.nextCursor && !isLoadingMore && (
							<p className="text-center text-gray-500 py-8">
								That's all the games for {monthLabel}
							</p>
						)}
					</>
				) : (
					<div className="text-center py-12">
						<Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
						<p className="text-gray-500">No games found for {monthLabel}</p>
					</div>
				)}
			</div>
		</div>
	);
}
