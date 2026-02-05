import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ChevronRight, Gamepad2, Pencil } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";

type QuestLogStatus =
	| "Playing"
	| "Beaten"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

import { StatusChangeModal } from "../questlog/StatusChangeModal";

interface NowPlayingProps {
	username: string;
	isOwnProfile: boolean;
}

// Status badge colors and labels
const statusConfig: Record<
	QuestLogStatus,
	{ label: string; color: string; bgColor: string }
> = {
	Playing: {
		label: "Playing",
		color: "text-green-400",
		bgColor: "bg-green-500/20",
	},
	Beaten: {
		label: "Beaten",
		color: "text-blue-400",
		bgColor: "bg-blue-500/20",
	},
	Completed: {
		label: "100%",
		color: "text-purple-400",
		bgColor: "bg-purple-500/20",
	},
	OnHold: {
		label: "On Hold",
		color: "text-yellow-400",
		bgColor: "bg-yellow-500/20",
	},
	Dropped: {
		label: "Dropped",
		color: "text-red-400",
		bgColor: "bg-red-500/20",
	},
	Backlog: {
		label: "Backlog",
		color: "text-gray-400",
		bgColor: "bg-gray-500/20",
	},
};

export function NowPlaying({ username, isOwnProfile }: NowPlayingProps) {
	const { user } = useUser();
	const data = useQuery(api.questlog.getNowPlaying, { username });
	const entries = data ?? [];
	const isLoading = data === undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Convex query return type
	const [selectedEntry, setSelectedEntry] = useState<any>(null);

	const handleStatusUpdate = () => {
		setSelectedEntry(null);
	};

	if (isLoading) {
		return (
			<div className="mb-6 p-5 bg-gray-800/50 rounded-xl border border-gray-700/50">
				<div className="flex items-center gap-2 mb-4">
					<Gamepad2 size={20} className="text-purple-400" />
					<h3 className="font-semibold text-white">Now Playing</h3>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 animate-pulse">
					{[1, 2, 3].map((i) => (
						<div key={i} className="aspect-[3/4] bg-gray-700 rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<div className="mb-6 p-5 bg-gray-800/50 rounded-xl border border-gray-700/50">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Gamepad2 size={20} className="text-purple-400" />
						<h3 className="font-semibold text-white">Now Playing</h3>
					</div>
					<Link
						to="/questlog/$username"
						params={{ username }}
						className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
					>
						Quest Log
						<ChevronRight size={16} />
					</Link>
				</div>
				<p className="text-gray-500 text-sm">
					{isOwnProfile
						? "No games currently playing. Visit a game page to add one!"
						: "No games currently playing."}
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="mb-6 p-5 bg-gray-800/50 rounded-xl border border-gray-700/50">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Gamepad2 size={20} className="text-purple-400" />
						<h3 className="font-semibold text-white">Now Playing</h3>
					</div>
					<Link
						to="/questlog/$username"
						params={{ username }}
						className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
					>
						Quest Log
						<ChevronRight size={16} />
					</Link>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
					{entries
						.filter(
							(
								entry,
							): entry is typeof entry & {
								game: NonNullable<typeof entry.game>;
							} => entry.game !== null,
						)
						.map((entry) => (
							<div key={entry._id} className="group relative">
								{/* Game Card */}
								<Link
									to="/games/$slug"
									params={{ slug: entry.game.slug }}
									className="block"
								>
									<div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-700 border-2 border-transparent group-hover:border-purple-500 transition-all shadow-lg">
										{entry.game.coverUrl ? (
											<img
												src={entry.game.coverUrl}
												alt={entry.game.name}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-gray-500">
												<Gamepad2 size={32} />
											</div>
										)}

										{/* Gradient overlay for text readability */}
										<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

										{/* Game name and status */}
										<div className="absolute bottom-0 left-0 right-0 p-3">
											<h4 className="text-white font-medium text-sm line-clamp-2 mb-1">
												{entry.game.name}
											</h4>
											<span
												className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[entry.status].bgColor} ${statusConfig[entry.status].color}`}
											>
												{statusConfig[entry.status].label}
											</span>
										</div>

										{/* Rating in corner */}
										{entry.quickRating && (
											<div className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs px-2 py-1 rounded-full font-medium">
												⭐ {entry.quickRating}/10
											</div>
										)}
									</div>
								</Link>

								{/* Edit button for own profile */}
								{isOwnProfile && (
									<button
										type="button"
										onClick={() => setSelectedEntry(entry)}
										className="absolute top-2 left-2 p-2.5 bg-black/80 hover:bg-purple-600 text-white rounded-lg shadow-lg transition-all flex items-center gap-1.5"
										title="Update Status"
									>
										<Pencil size={16} />
										<span className="text-xs font-medium hidden sm:inline">
											Edit
										</span>
									</button>
								)}
							</div>
						))}
				</div>
			</div>

			{/* Status Change Modal */}
			{selectedEntry && user && (
				<StatusChangeModal
					isOpen={true}
					onClose={() => setSelectedEntry(null)}
					onSuccess={handleStatusUpdate}
					onRemove={() => setSelectedEntry(null)}
					clerkId={user.id}
					gameId={selectedEntry.gameId}
					gameName={selectedEntry.game?.name ?? ""}
					currentStatus={selectedEntry.status}
					questLogId={selectedEntry._id}
					currentStartedAt={selectedEntry.startedAt}
					currentCompletedAt={selectedEntry.completedAt}
					currentPlatform={selectedEntry.platform}
					currentDifficulty={selectedEntry.difficulty}
					gamePlatforms={selectedEntry.game?.platforms ?? []}
				/>
			)}
		</>
	);
}
