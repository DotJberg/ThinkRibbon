import type {
	SuggestionKeyDownProps,
	SuggestionProps,
} from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface MentionSuggestionItem {
	id: string;
	label: string;
	sublabel?: string;
	imageUrl?: string;
}

export interface MentionSuggestionRef {
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface MentionSuggestionListProps {
	items: MentionSuggestionItem[];
	command: SuggestionProps["command"];
}

export const MentionSuggestionList = forwardRef<
	MentionSuggestionRef,
	MentionSuggestionListProps
>(({ items, command }, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset index when items change
	useEffect(() => setSelectedIndex(0), [items]);

	useImperativeHandle(
		ref,
		() => ({
			onKeyDown: ({ event }: SuggestionKeyDownProps) => {
				if (event.key === "ArrowUp") {
					setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
					return true;
				}
				if (event.key === "ArrowDown") {
					setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
					return true;
				}
				if (event.key === "Enter") {
					const item = items[selectedIndex];
					if (item) command(item);
					return true;
				}
				return false;
			},
		}),
		[items, selectedIndex, command],
	);

	if (!items.length) return null;

	return (
		<div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 w-64 max-h-60 overflow-y-auto">
			{items.map((item, index) => (
				<button
					key={item.id}
					type="button"
					onClick={() => command(item)}
					className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
						index === selectedIndex
							? "bg-gray-700 text-white"
							: "text-gray-300 hover:bg-gray-700/50"
					}`}
				>
					{item.imageUrl ? (
						<img
							src={item.imageUrl}
							alt=""
							className="w-6 h-6 rounded-full object-cover flex-shrink-0"
						/>
					) : (
						<div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
							<span className="text-xs font-bold text-gray-300">
								{item.label[0]?.toUpperCase()}
							</span>
						</div>
					)}
					<div className="min-w-0 flex-1">
						<span className="block truncate font-medium">{item.label}</span>
						{item.sublabel && (
							<span className="block truncate text-xs text-gray-500">
								{item.sublabel}
							</span>
						)}
					</div>
				</button>
			))}
		</div>
	);
});

MentionSuggestionList.displayName = "MentionSuggestionList";
