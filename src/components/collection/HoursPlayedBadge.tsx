import { Clock } from "lucide-react";

interface HoursPlayedBadgeProps {
	hours: number;
	size?: "sm" | "md";
}

function getTierStyles(hours: number): string {
	if (hours >= 1000) {
		return "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30";
	}
	if (hours >= 500) {
		return "bg-orange-500/20 text-orange-400 border-orange-500/30";
	}
	if (hours >= 100) {
		return "bg-purple-500/20 text-purple-400 border-purple-500/30";
	}
	if (hours >= 50) {
		return "bg-blue-500/20 text-blue-400 border-blue-500/30";
	}
	if (hours >= 20) {
		return "bg-green-500/20 text-green-400 border-green-500/30";
	}
	return "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

export function HoursPlayedBadge({
	hours,
	size = "sm",
}: HoursPlayedBadgeProps) {
	const tierStyles = getTierStyles(hours);
	const iconSize = size === "sm" ? 12 : 14;

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border font-medium ${tierStyles} ${
				size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
			}`}
		>
			<Clock size={iconSize} />
			{hours}h
		</span>
	);
}
