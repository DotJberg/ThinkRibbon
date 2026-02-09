import { useEffect, useState } from "react";
import { PixelHeart } from "./PixelHeart";

interface LikeButtonProps {
	initialLiked?: boolean;
	likeCount: number;
	onToggle: () => Promise<{ liked: boolean }>;
	disabled?: boolean;
}

export function LikeButton({
	initialLiked = false,
	likeCount,
	onToggle,
	disabled,
}: LikeButtonProps) {
	const [liked, setLiked] = useState(initialLiked);
	const [count, setCount] = useState(likeCount);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		setLiked(initialLiked);
	}, [initialLiked]);

	useEffect(() => {
		setCount(likeCount);
	}, [likeCount]);

	const handleClick = async () => {
		if (disabled || isLoading) return;

		setIsLoading(true);
		try {
			const result = await onToggle();
			setLiked(result.liked);
			setCount((prev) => (result.liked ? prev + 1 : prev - 1));
		} catch (error) {
			console.error("Failed to toggle like:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={disabled || isLoading}
			className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
				liked
					? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
					: "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
			} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
		>
			<PixelHeart size={16} filled={liked} animateOnFill />
			<span>{count}</span>
		</button>
	);
}
