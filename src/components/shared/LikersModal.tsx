import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { PixelHeart } from "./PixelHeart";
import { SafeImage } from "./SafeImage";

interface LikersModalProps {
	isOpen: boolean;
	onClose: () => void;
	targetType: "post" | "article" | "review" | "comment";
	targetId: string;
}

export function LikersModal({
	isOpen,
	onClose,
	targetType,
	targetId,
}: LikersModalProps) {
	const likers = useQuery(
		api.likes.getLikers,
		isOpen ? { targetType, targetId } : "skip",
	);

	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect */}
			<div
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-red-500/20 rounded-lg">
						<PixelHeart size={20} filled />
					</div>
					<h3 className="text-lg font-bold text-white">Liked by</h3>
				</div>

				<div className="max-h-80 overflow-y-auto space-y-3">
					{likers === undefined && (
						<div className="flex justify-center py-6">
							<div className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
						</div>
					)}
					{likers && likers.length === 0 && (
						<p className="text-gray-500 text-center py-6">No likes yet</p>
					)}
					{likers?.map((user) => (
						<Link
							key={user._id}
							to="/profile/$username"
							params={{ username: user.username }}
							onClick={onClose}
							className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
						>
							<div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden flex-shrink-0">
								<SafeImage
									src={user.avatarUrl || undefined}
									alt=""
									className="w-full h-full object-cover"
									fallback={
										<span className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
											{(user.displayName || user.username)[0].toUpperCase()}
										</span>
									}
								/>
							</div>
							<div className="min-w-0">
								<div className="text-white font-medium text-sm truncate">
									{user.displayName || user.username}
								</div>
								<div className="text-gray-500 text-xs truncate">
									@{user.username}
								</div>
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
