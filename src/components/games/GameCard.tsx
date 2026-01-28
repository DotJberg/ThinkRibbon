import { Link } from "@tanstack/react-router";
import { Gamepad2, Star } from "lucide-react";

interface GameCardProps {
	game: {
		id: string;
		name: string;
		slug: string;
		coverUrl: string | null;
		genres: string[];
		rating?: number | null;
		releaseDate?: Date | string | null;
		_count?: {
			reviews: number;
		};
		averageRating?: number;
	};
}

export function GameCard({ game }: GameCardProps) {
	const year = game.releaseDate
		? new Date(game.releaseDate).getFullYear()
		: null;

	return (
		<Link
			to="/games/$slug"
			params={{ slug: game.slug }}
			className="group block"
		>
			<article className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
				{/* Cover */}
				<div className="aspect-[3/4] bg-gray-700 overflow-hidden relative">
					{game.coverUrl ? (
						<img
							src={game.coverUrl}
							alt={game.name}
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<Gamepad2 className="w-12 h-12 text-gray-500" />
						</div>
					)}

					{/* Rating Badge */}
					{game.averageRating !== undefined && game.averageRating > 0 && (
						<div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full">
							<Star size={12} className="fill-yellow-400 text-yellow-400" />
							<span className="text-xs font-bold text-white">
								{game.averageRating.toFixed(1)}
							</span>
						</div>
					)}
				</div>

				{/* Info */}
				<div className="p-3">
					<h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
						{game.name}
					</h3>
					<div className="flex items-center gap-2 mt-1">
						{year && <span className="text-xs text-gray-500">{year}</span>}
						{game._count?.reviews !== undefined && game._count.reviews > 0 && (
							<span className="text-xs text-gray-500">
								{game._count.reviews} reviews
							</span>
						)}
					</div>
					{game.genres.length > 0 && (
						<div className="flex flex-wrap gap-1 mt-2">
							{game.genres.slice(0, 2).map((genre) => (
								<span
									key={genre}
									className="px-2 py-0.5 bg-gray-700/70 rounded-full text-xs text-gray-400"
								>
									{genre}
								</span>
							))}
						</div>
					)}
				</div>
			</article>
		</Link>
	);
}
