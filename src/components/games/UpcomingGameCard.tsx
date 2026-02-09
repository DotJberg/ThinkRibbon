import { Link } from "@tanstack/react-router";
import { Calendar, Clock, Gamepad2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCountdown, formatReleaseDate } from "@/lib/date-utils";
import type { FormattedGame } from "@/types/game";

interface UpcomingGameCardProps {
	game: FormattedGame;
}

export function UpcomingGameCard({ game }: UpcomingGameCardProps) {
	const [countdown, setCountdown] = useState(formatCountdown(game.releaseDate));

	// Update countdown every minute
	useEffect(() => {
		const interval = setInterval(() => {
			setCountdown(formatCountdown(game.releaseDate));
		}, 60000);

		return () => clearInterval(interval);
	}, [game.releaseDate]);

	return (
		<Link
			to="/games/$slug"
			params={{ slug: game.slug }}
			className="group flex gap-4 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-slate-500/50 rounded-xl transition-all"
		>
			{/* Cover Image */}
			<div className="w-20 h-28 flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden">
				{game.coverUrl ? (
					<img
						src={game.coverUrl}
						alt={game.name}
						loading="lazy"
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<Gamepad2 className="text-gray-500" size={24} />
					</div>
				)}
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0 flex flex-col justify-between py-1">
				<div>
					{/* Category Label */}
					{game.categoryLabel && (
						<span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-500/20 text-slate-300 rounded mb-1">
							{game.categoryLabel}
						</span>
					)}

					{/* Name */}
					<h3 className="font-semibold text-white group-hover:text-slate-400 transition-colors line-clamp-2">
						{game.name}
					</h3>

					{/* Genres */}
					{game.genres.length > 0 && (
						<p className="text-xs text-gray-500 mt-1 line-clamp-1">
							{game.genres.slice(0, 2).join(" • ")}
						</p>
					)}
				</div>

				{/* Release Info */}
				<div className="flex items-center gap-4 mt-2">
					{/* Release Date */}
					<div className="flex items-center gap-1 text-xs text-gray-400">
						<Calendar size={12} />
						<span>{formatReleaseDate(game.releaseDate)}</span>
					</div>

					{/* Countdown */}
					<div className="flex items-center gap-1 text-xs font-medium text-slate-400">
						<Clock size={12} />
						<span>{countdown}</span>
					</div>
				</div>
			</div>
		</Link>
	);
}
