import { TAGS } from "../../lib/tags";

interface TagDisplayProps {
	tags?: string[];
	genres?: string[];
}

export function TagDisplay({ tags, genres }: TagDisplayProps) {
	const hasTags = tags && tags.length > 0;
	const hasGenres = genres && genres.length > 0;

	if (!hasTags && !hasGenres) return null;

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
			{hasGenres &&
				genres.map((genre) => (
					<span
						key={genre}
						className="px-2 py-0.5 bg-gray-700/70 rounded-full text-xs text-gray-400"
					>
						{genre}
					</span>
				))}
		</div>
	);
}
