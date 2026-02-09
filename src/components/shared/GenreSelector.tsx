import { GENRES } from "../../lib/genres";

interface GenreSelectorProps {
	selectedGenres: string[];
	onChange: (genres: string[]) => void;
	igdbGenres?: string[];
}

export function GenreSelector({
	selectedGenres,
	onChange,
	igdbGenres,
}: GenreSelectorProps) {
	const igdbSet = new Set(igdbGenres ?? []);

	const toggle = (genre: string) => {
		if (selectedGenres.includes(genre)) {
			onChange(selectedGenres.filter((g) => g !== genre));
		} else {
			onChange([...selectedGenres, genre]);
		}
	};

	return (
		<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
			<span className="block text-sm font-medium text-gray-300 mb-3">
				Genres (optional)
			</span>
			<div className="flex flex-wrap gap-2">
				{GENRES.map((genre) => {
					const selected = selectedGenres.includes(genre);
					const isIgdb = igdbSet.has(genre);
					return (
						<button
							key={genre}
							type="button"
							onClick={() => toggle(genre)}
							className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
								selected
									? "bg-slate-500/20 text-slate-300 border-slate-500/40"
									: isIgdb
										? "bg-gray-700/50 text-gray-300 border-dashed border-gray-500/50 hover:bg-gray-700 hover:text-white"
										: "bg-gray-700/50 text-gray-400 border-gray-600/50 hover:bg-gray-700 hover:text-gray-300"
							}`}
						>
							{genre}
						</button>
					);
				})}
			</div>
			{igdbSet.size > 0 && (
				<p className="text-xs text-gray-500 mt-3">
					Dashed borders show genres from the game's listing
				</p>
			)}
		</div>
	);
}
