import { TAGS } from "../../lib/tags";

interface TagDisplayProps {
	tags?: string[];
	genres?: string[];
	maxGenres?: number;
}

export function TagDisplay({ tags, genres, maxGenres = 3 }: TagDisplayProps) {
	const hasTags = tags && tags.length > 0;
	const hasGenres = genres && genres.length > 0;

	if (!hasTags && !hasGenres) return null;

	const displayGenres = hasGenres ? genres.slice(0, maxGenres) : [];
	const remainingGenres = hasGenres ? genres.length - maxGenres : 0;

	return (
		<div className="flex flex-wrap gap-1.5">
			{hasTags &&
				tags.map((key) => {
					const tag = TAGS[key];
					if (!tag) return null;
					return (
						<span
							key={key}
							className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tag.bg} ${tag.text} ${tag.border}`}
						>
							{tag.label}
						</span>
					);
				})}
			{displayGenres.map((genre) => (
				<span
					key={genre}
					className="px-2 py-0.5 bg-gray-700/70 rounded-full text-xs text-gray-400"
				>
					{genre}
				</span>
			))}
			{remainingGenres > 0 && (
				<span className="px-2 py-0.5 text-xs text-gray-500">
					+{remainingGenres} more
				</span>
			)}
		</div>
	);
}
