import { ChevronDown, Clock, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type GamesFeedType = "latest-reviewed" | "highest-rated";

interface FeedOption {
	type: GamesFeedType;
	label: string;
	icon: React.ReactNode;
	description: string;
}

const feedOptions: FeedOption[] = [
	{
		type: "latest-reviewed",
		label: "Latest Reviewed",
		icon: <Clock size={18} />,
		description: "Recently reviewed by the community",
	},
	{
		type: "highest-rated",
		label: "Highest Rated",
		icon: <Star size={18} />,
		description: "Top rated games on the site",
	},
];

interface GamesFeedSelectorProps {
	selectedFeed: GamesFeedType;
	onFeedChange: (feed: GamesFeedType) => void;
}

export function GamesFeedSelector({
	selectedFeed,
	onFeedChange,
}: GamesFeedSelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const selectedOption = feedOptions.find((f) => f.type === selectedFeed);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div ref={dropdownRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all bg-gradient-to-r from-purple-600 to-pink-600 text-white"
			>
				{selectedOption?.icon}
				{selectedOption?.label}
				<ChevronDown
					size={16}
					className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
					{feedOptions.map((option) => (
						<button
							key={option.type}
							type="button"
							onClick={() => {
								onFeedChange(option.type);
								setIsOpen(false);
							}}
							className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
								selectedFeed === option.type
									? "bg-purple-600/20 text-white"
									: "text-gray-300 hover:bg-gray-700/50 hover:text-white"
							}`}
						>
							<span
								className={`mt-0.5 ${selectedFeed === option.type ? "text-purple-400" : "text-gray-500"}`}
							>
								{option.icon}
							</span>
							<div>
								<div className="font-medium">{option.label}</div>
								<div className="text-xs text-gray-500">
									{option.description}
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
