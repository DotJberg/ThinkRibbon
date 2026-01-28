import { Star } from "lucide-react";

interface StarRatingProps {
	rating: number;
	maxRating?: number;
	size?: "sm" | "md" | "lg";
	interactive?: boolean;
	onChange?: (rating: number) => void;
}

const sizeMap = {
	sm: 14,
	md: 20,
	lg: 28,
};

export function StarRating({
	rating,
	maxRating = 5,
	size = "md",
	interactive = false,
	onChange,
}: StarRatingProps) {
	const starSize = sizeMap[size];

	const handleClick = (index: number) => {
		if (interactive && onChange) {
			onChange(index + 1);
		}
	};

	return (
		<div className="flex gap-0.5">
			{Array.from({ length: maxRating }, (_, i) => {
				const filled = i < rating;
				return (
					<button
						key={i}
						type="button"
						onClick={() => handleClick(i)}
						disabled={!interactive}
						className={`transition-transform duration-150 ${
							interactive ? "hover:scale-110 cursor-pointer" : "cursor-default"
						}`}
					>
						<Star
							size={starSize}
							className={`transition-colors duration-150 ${
								filled
									? "fill-yellow-400 text-yellow-400"
									: "text-gray-600 hover:text-yellow-400/50"
							}`}
						/>
					</button>
				);
			})}
		</div>
	);
}

export function StarRatingDisplay({
	rating,
	reviewCount,
}: {
	rating: number;
	reviewCount?: number;
}) {
	return (
		<div className="flex items-center gap-2">
			<StarRating rating={Math.round(rating)} size="sm" />
			<span className="text-sm text-gray-400">
				{rating.toFixed(1)}
				{reviewCount !== undefined && (
					<span className="text-gray-500"> ({reviewCount} reviews)</span>
				)}
			</span>
		</div>
	);
}
