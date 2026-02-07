import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	ArrowLeft,
	ChevronDown,
	Filter,
	Gamepad2,
	Grid,
	List,
	Pencil,
	Plus,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { GameSearchModal } from "../../components/questlog/GameSearchModal";
import { StatusChangeModal } from "../../components/questlog/StatusChangeModal";

type QuestLogStatus =
	| "Playing"
	| "Beaten"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

export const Route = createFileRoute("/questlog/$username")({
	component: QuestLogPage,
});

type QuestLogEntry = {
	_id: string;
	gameId: string;
	status: QuestLogStatus;
	platform?: string;
	difficulty?: string;
	startedAt?: number;
	completedAt?: number;
	notes?: string;
	hoursPlayed?: number;
	quickRating?: number;
	game: {
		_id: string;
		name: string;
		slug: string;
		coverUrl?: string;
		platforms?: string[];
	} | null;
};

const statusLabels: Record<QuestLogStatus, string> = {
	Playing: "Playing",
	Beaten: "Beaten",
	Completed: "100%",
	OnHold: "On Hold",
	Dropped: "Dropped",
	Backlog: "Backlog",
};

const statusColors: Record<QuestLogStatus, string> = {
	Playing: "bg-green-500",
	Beaten: "bg-blue-500",
	Completed: "bg-purple-500",
	OnHold: "bg-yellow-500",
	Dropped: "bg-red-500",
	Backlog: "bg-gray-500",
};

function QuestLogPage() {
	const { username } = Route.useParams();
	const { user: currentUser, isSignedIn } = useUser();
	const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline");
	const [statusFilter, setStatusFilter] = useState<QuestLogStatus | "all">(
		"all",
	);
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	// Modal state
	const [showGameSearch, setShowGameSearch] = useState(false);
	const [editingEntry, setEditingEntry] = useState<QuestLogEntry | null>(null);

	// Check if viewing own profile
	const isOwnProfile = isSignedIn && currentUser?.username === username;

	// Convex queries
	const profile = useQuery(api.users.getByUsername, { username });

	const timelineData = useQuery(
		api.questlog.getTimeline,
		viewMode === "timeline" ? { username } : "skip",
	);

	const gridData = useQuery(
		api.questlog.getUserQuestLog,
		viewMode === "grid"
			? { username, status: statusFilter === "all" ? undefined : statusFilter }
			: "skip",
	);

	const isLoading =
		viewMode === "timeline"
			? timelineData === undefined
			: gridData === undefined;

	const entries: QuestLogEntry[] =
		viewMode === "timeline"
			? (timelineData?.entries ?? [])
			: (gridData?.entries ?? []);

	const filteredEntries =
		statusFilter === "all"
			? entries
			: entries.filter((e) => e.status === statusFilter);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8 flex-wrap gap-4">
					<div className="flex items-center gap-4">
						<Link
							to="/profile/$username"
							params={{ username }}
							className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
						>
							<ArrowLeft size={20} />
						</Link>
						<div>
							<h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
								<Gamepad2 className="text-purple-400" />
								{profile?.displayName || profile?.username}'s Quest Log
							</h1>
							<p className="text-gray-400 text-sm">
								{entries.length} games logged
							</p>
						</div>
					</div>

					{/* Add Game Button (own profile only) */}
					{isOwnProfile && currentUser && (
						<button
							type="button"
							onClick={() => setShowGameSearch(true)}
							className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg shadow-lg transition-all"
						>
							<Plus size={18} />
							Add Game
						</button>
					)}

					{/* View Toggle */}
					<div className="flex items-center gap-2">
						<div className="flex bg-gray-800 rounded-lg p-1">
							<button
								type="button"
								onClick={() => setViewMode("timeline")}
								className={`p-2 rounded transition-colors ${
									viewMode === "timeline"
										? "bg-purple-500 text-white"
										: "text-gray-400 hover:text-white"
								}`}
								title="Timeline View"
							>
								<List size={18} />
							</button>
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={`p-2 rounded transition-colors ${
									viewMode === "grid"
										? "bg-purple-500 text-white"
										: "text-gray-400 hover:text-white"
								}`}
								title="Grid View"
							>
								<Grid size={18} />
							</button>
						</div>

						{/* Status Filter */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsFilterOpen(!isFilterOpen)}
								className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors"
							>
								<Filter size={16} />
								{statusFilter === "all" ? "All" : statusLabels[statusFilter]}
								<ChevronDown size={16} />
							</button>
							{isFilterOpen && (
								<div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
									<button
										type="button"
										onClick={() => {
											setStatusFilter("all");
											setIsFilterOpen(false);
										}}
										className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors ${
											statusFilter === "all"
												? "text-purple-400"
												: "text-gray-300"
										}`}
									>
										All
									</button>
									{(
										Object.entries(statusLabels) as [QuestLogStatus, string][]
									).map(([value, label]) => (
										<button
											key={value}
											type="button"
											onClick={() => {
												setStatusFilter(value);
												setIsFilterOpen(false);
											}}
											className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 ${
												statusFilter === value
													? "text-purple-400"
													: "text-gray-300"
											}`}
										>
											<span
												className={`w-2 h-2 rounded-full ${statusColors[value]}`}
											/>
											{label}
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Content */}
				{isLoading ? (
					<div className="flex justify-center py-12">
						<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : filteredEntries.length === 0 ? (
					<div className="text-center py-12 text-gray-500">
						{statusFilter === "all"
							? "No games in quest log yet"
							: `No games with status "${statusLabels[statusFilter]}"`}
					</div>
				) : viewMode === "timeline" ? (
					<TimelineView
						entries={filteredEntries}
						isOwnProfile={isOwnProfile}
						onEditEntry={setEditingEntry}
					/>
				) : (
					<GridView
						entries={filteredEntries}
						isOwnProfile={isOwnProfile}
						onEditEntry={setEditingEntry}
					/>
				)}
			</div>

			{/* Game Search Modal */}
			{isOwnProfile && currentUser && (
				<GameSearchModal
					isOpen={showGameSearch}
					onClose={() => setShowGameSearch(false)}
					onSuccess={() => {
						// Convex reactivity handles refresh
					}}
					clerkId={currentUser.id}
				/>
			)}

			{/* Status Edit Modal */}
			{editingEntry && currentUser && (
				<StatusChangeModal
					isOpen={true}
					onClose={() => setEditingEntry(null)}
					onSuccess={() => {
						setEditingEntry(null);
						// Convex reactivity handles refresh
					}}
					onRemove={() => setEditingEntry(null)}
					clerkId={currentUser.id}
					gameId={editingEntry.gameId}
					gameName={editingEntry.game?.name ?? "Unknown"}
					currentStatus={editingEntry.status}
					questLogId={editingEntry._id}
					currentStartedAt={editingEntry.startedAt}
					currentCompletedAt={editingEntry.completedAt}
					currentPlatform={editingEntry.platform}
					currentDifficulty={editingEntry.difficulty}
					gamePlatforms={editingEntry.game?.platforms ?? []}
				/>
			)}
		</div>
	);
}

// Timeline View Component
function TimelineView({
	entries,
	isOwnProfile,
	onEditEntry,
}: {
	entries: QuestLogEntry[];
	isOwnProfile?: boolean;
	onEditEntry?: (entry: QuestLogEntry) => void;
}) {
	return (
		<div className="space-y-4">
			{entries.map((entry) => (
				<div
					key={entry._id}
					className="relative bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-purple-500/50 transition-all"
				>
					<Link
						to="/games/$slug"
						params={{ slug: entry.game?.slug ?? "" }}
						className="flex gap-4"
					>
						{/* Game Cover */}
						<div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
							{entry.game?.coverUrl ? (
								<img
									src={entry.game.coverUrl}
									alt={entry.game.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-gray-500">
									<Gamepad2 size={24} />
								</div>
							)}
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<h3 className="font-semibold text-white truncate">
									{entry.game?.name}
								</h3>
								<span
									className={`px-2 py-0.5 text-xs font-medium rounded-full text-white ${statusColors[entry.status]}`}
								>
									{statusLabels[entry.status]}
								</span>
							</div>

							{entry.quickRating && (
								<div className="text-yellow-400 text-sm mb-1">
									{"⭐".repeat(entry.quickRating)} ({entry.quickRating}/5)
								</div>
							)}

							{entry.notes && (
								<p className="text-gray-400 text-sm line-clamp-2">
									{entry.notes}
								</p>
							)}

							<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
								{entry.startedAt && (
									<span>
										Started: {new Date(entry.startedAt).toLocaleDateString()}
									</span>
								)}
								{entry.completedAt && (
									<span>
										Completed:{" "}
										{new Date(entry.completedAt).toLocaleDateString()}
									</span>
								)}
								{entry.hoursPlayed && (
									<span>{entry.hoursPlayed} hours played</span>
								)}
							</div>
						</div>
					</Link>

					{/* Edit Button */}
					{isOwnProfile && onEditEntry && (
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onEditEntry(entry);
							}}
							className="absolute top-3 right-3 p-2 bg-gray-900/80 hover:bg-purple-600 text-gray-400 hover:text-white rounded-lg transition-all"
							title="Edit entry"
						>
							<Pencil size={16} />
						</button>
					)}
				</div>
			))}
		</div>
	);
}

// Grid View Component
function GridView({
	entries,
	isOwnProfile,
	onEditEntry,
}: {
	entries: QuestLogEntry[];
	isOwnProfile?: boolean;
	onEditEntry?: (entry: QuestLogEntry) => void;
}) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
			{entries.map((entry) => (
				<div key={entry._id} className="group relative">
					<Link
						to="/games/$slug"
						params={{ slug: entry.game?.slug ?? "" }}
						className="block"
					>
						<div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-800 border-2 border-transparent group-hover:border-purple-500 transition-all">
							{entry.game?.coverUrl ? (
								<img
									src={entry.game.coverUrl}
									alt={entry.game.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-gray-600">
									<Gamepad2 size={48} />
								</div>
							)}

							{/* Status Badge */}
							<div
								className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusColors[entry.status]} border-2 border-gray-900`}
								title={statusLabels[entry.status]}
							/>

							{/* Hover Overlay */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
								<h3 className="font-semibold text-white text-sm line-clamp-2">
									{entry.game?.name}
								</h3>
								<span className="text-xs text-gray-300">
									{statusLabels[entry.status]}
								</span>
								{entry.quickRating && (
									<span className="text-yellow-400 text-xs">
										{entry.quickRating}/5
									</span>
								)}
							</div>
						</div>
					</Link>

					{/* Edit Button */}
					{isOwnProfile && onEditEntry && (
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onEditEntry(entry);
							}}
							className="absolute top-2 left-2 p-1.5 bg-gray-900/80 hover:bg-purple-600 text-gray-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
							title="Edit entry"
						>
							<Pencil size={14} />
						</button>
					)}
				</div>
			))}
		</div>
	);
}
