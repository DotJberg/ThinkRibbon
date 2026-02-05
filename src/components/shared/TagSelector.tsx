import { TAG_KEYS, TAGS } from "../../lib/tags";

interface TagSelectorProps {
	selectedTags: string[];
	onChange: (tags: string[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
	const toggle = (tag: string) => {
		if (selectedTags.includes(tag)) {
			onChange(selectedTags.filter((t) => t !== tag));
		} else {
			onChange([...selectedTags, tag]);
		}
	};

	return (
		<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
			<span className="block text-sm font-medium text-gray-300 mb-3">
				Tags (optional)
			</span>
			<div className="flex flex-wrap gap-2">
				{TAG_KEYS.map((key) => {
					const tag = TAGS[key];
					const selected = selectedTags.includes(key);
					return (
						<button
							key={key}
							type="button"
							onClick={() => toggle(key)}
							className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
								selected
									? `${tag.bg} ${tag.text} ${tag.border}`
									: "bg-gray-700/50 text-gray-400 border-gray-600/50 hover:bg-gray-700 hover:text-gray-300"
							}`}
						>
							{tag.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
