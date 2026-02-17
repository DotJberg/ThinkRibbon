import { Star } from "lucide-react";
import { useRef, useState } from "react";
import { getRatingLabel } from "../../../convex/ratings";

interface StarRatingProps {
	rating: number;
	maxRating?: number;
	size?: "sm" | "md" | "lg";
	interactive?: boolean;
	onChange?: (rating: number) => void;
	showLabel?: boolean;
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
	showLabel = false,
}: StarRatingProps) {
	const starSize = sizeMap[size];
	const [hoverRating, setHoverRating] = useState(0);

	const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;
	const label = getRatingLabel(displayRating);

	return (
		<div className="flex flex-col gap-1">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Star container only uses mouse events for hover preview */}
			<div
				className="flex gap-0.5"
				onMouseLeave={() => interactive && setHoverRating(0)}
			>
				{Array.from({ length: maxRating }, (_, i) => (
					<HalfStarButton
						// biome-ignore lint/suspicious/noArrayIndexKey: Static array of stars
						key={i}
						index={i}
						rating={displayRating}
						starSize={starSize}
						interactive={interactive}
						onChange={onChange}
						onHover={interactive ? setHoverRating : undefined}
					/>
				))}
			</div>
			{showLabel && label && (
				<span className="text-sm text-gray-400">{label}</span>
			)}
		</div>
	);
}

function HalfStarButton({
	index,
	rating,
	starSize,
	interactive,
	onChange,
	onHover,
}: {
	index: number;
	rating: number;
	starSize: number;
	interactive: boolean;
	onChange?: (rating: number) => void;
	onHover?: (rating: number) => void;
}) {
	const ref = useRef<HTMLButtonElement>(null);

	const getRatingFromEvent = (
		e: React.MouseEvent<HTMLButtonElement>,
	): number => {
		const rect = ref.current?.getBoundingClientRect();
		if (!rect) return index + 1;
		const x = e.clientX - rect.left;
		return x < rect.width / 2 ? index + 0.5 : index + 1;
	};

	const isFull = rating >= index + 1;
	const isHalf = !isFull && rating >= index + 0.5;

	return (
		<button
			ref={ref}
			type="button"
			onClick={(e) => {
				if (interactive && onChange) {
					onChange(getRatingFromEvent(e));
				}
			}}
			onMouseMove={(e) => {
				if (interactive && onHover) {
					onHover(getRatingFromEvent(e));
				}
			}}
			disabled={!interactive}
			className={`relative transition-transform duration-150 ${
				interactive ? "hover:scale-110 cursor-pointer" : "cursor-default"
			}`}
		>
			{/* Empty star (background) */}
			<Star size={starSize} className="text-gray-600" />

			{/* Filled star (full or half via clip-path) */}
			{(isFull || isHalf) && (
				<Star
					size={starSize}
					className="absolute inset-0 fill-yellow-400 text-yellow-400 transition-colors duration-150"
					style={isHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
				/>
			)}
		</button>
	);
}

export function StarRatingDisplay({
	rating,
	reviewCount,
}: {
	rating: number;
	reviewCount?: number;
}) {
	const rounded = Math.round(rating * 2) / 2;
	return (
		<div className="flex items-center gap-2">
			<StarRating rating={rounded} size="sm" />
			<span className="text-sm text-gray-400">
				{rating.toFixed(1)}
				{reviewCount !== undefined && (
					<span className="text-gray-500"> ({reviewCount} reviews)</span>
				)}
			</span>
		</div>
	);
}
