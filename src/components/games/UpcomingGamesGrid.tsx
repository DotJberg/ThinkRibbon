import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight } from "lucide-react";
import { UpcomingGameCard } from "./UpcomingGameCard";

interface Game {
	id: string;
	name: string;
	slug: string;
	coverUrl: string | null;
	genres: string[];
	releaseDate: Date;
	categoryLabel?: string;
}

interface UpcomingGamesGridProps {
	games: Game[];
	monthTotals?: Record<string, number>;
}

function getMonthYearKey(date: Date): string {
	// Use UTC to match server-side grouping
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYear(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

export function UpcomingGamesGrid({
	games,
	monthTotals = {},
}: UpcomingGamesGridProps) {
	// Group games by month
	const groupedGames = games.reduce<Record<string, Game[]>>((acc, game) => {
		const key = getMonthYearKey(game.releaseDate);
		if (!acc[key]) {
			acc[key] = [];
		}
		acc[key].push(game);
		return acc;
	}, {});

	// Sort months chronologically
	const sortedMonths = Object.keys(groupedGames).sort();

	if (sortedMonths.length === 0) {
		return (
			<div className="text-center py-12">
				<Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
				<p className="text-gray-500">No upcoming games found</p>
				<p className="text-gray-600 text-sm mt-1">
					Check back later for new releases
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{sortedMonths.map((monthKey) => {
				const monthGames = groupedGames[monthKey];
				const firstGame = monthGames[0];
				const monthLabel = formatMonthYear(firstGame.releaseDate);
				const totalGames = monthTotals[monthKey] || monthGames.length;
				const hasMore = totalGames > monthGames.length;

				return (
					<div key={monthKey}>
						{/* Month Header */}
						<div className="flex items-center gap-3 mb-4">
							<div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full">
								<Calendar size={16} className="text-purple-400" />
								<h2 className="font-semibold text-white">{monthLabel}</h2>
							</div>
							<div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent" />
							<span className="text-sm text-gray-500">
								{monthGames.length} game{monthGames.length !== 1 ? "s" : ""}
							</span>
						</div>

						{/* Games Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{monthGames.map((game) => (
								<UpcomingGameCard key={game.id} game={game} />
							))}
						</div>

						{/* View All Button */}
						{hasMore && (
							<div className="mt-4 text-center">
								<Link
									to="/games/upcoming/$month"
									params={{ month: monthKey }}
									className="inline-flex items-center gap-2 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full transition-colors"
								>
									View all games for {monthLabel}
									<ChevronRight size={16} />
								</Link>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
