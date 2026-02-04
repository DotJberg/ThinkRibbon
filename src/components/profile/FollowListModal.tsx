import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { X } from "lucide-react";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SafeImage } from "../shared/SafeImage";

interface FollowListModalProps {
	isOpen: boolean;
	onClose: () => void;
	userId: Id<"users">;
	type: "followers" | "following";
}

export function FollowListModal({
	isOpen,
	onClose,
	userId,
	type,
}: FollowListModalProps) {
	const followers = useQuery(
		api.users.getFollowersList,
		isOpen && type === "followers" ? { userId } : "skip",
	);
	const following = useQuery(
		api.users.getFollowingList,
		isOpen && type === "following" ? { userId } : "skip",
	);

	const users = type === "followers" ? followers : following;
	const title = type === "followers" ? "Followers" : "Following";

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
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect */}
			<div
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-800">
					<h3 className="text-lg font-bold text-white">{title}</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
					>
						<X size={20} className="text-gray-400" />
					</button>
				</div>

				{/* User List */}
				<div className="flex-1 overflow-y-auto">
					{users === undefined ? (
						<div className="flex items-center justify-center py-12">
							<div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
						</div>
					) : users.length === 0 ? (
						<div className="text-center py-12 text-gray-500">
							{type === "followers"
								? "No followers yet"
								: "Not following anyone yet"}
						</div>
					) : (
						<div className="divide-y divide-gray-800">
							{users.map((user) => (
								<Link
									key={user._id}
									to="/profile/$username"
									params={{ username: user.username }}
									onClick={onClose}
									className="flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors"
								>
									<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex-shrink-0">
										<SafeImage
											src={user.avatarUrl || undefined}
											alt={user.username}
											className="w-full h-full object-cover"
											fallback={
												<div className="w-full h-full flex items-center justify-center text-sm text-white font-bold">
													{(user.displayName || user.username)[0].toUpperCase()}
												</div>
											}
										/>
									</div>
									<div className="min-w-0">
										<p className="text-white font-medium truncate">
											{user.displayName || user.username}
										</p>
										<p className="text-gray-500 text-sm truncate">
											@{user.username}
										</p>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
