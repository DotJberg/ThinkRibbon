import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ChevronDown,
	Filter,
	Gamepad2,
	Grid,
	List,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { QuestLogStatus } from "../../generated/prisma/client.js";
import {
	getQuestLogTimeline,
	getUserQuestLog,
} from "../../lib/server/questlog";
import { getUserByUsername } from "../../lib/server/users";

export const Route = createFileRoute("/questlog/$username")({
	component: QuestLogPage,
});

type QuestLogEntry = Awaited<
	ReturnType<typeof getUserQuestLog>
>["entries"][number];

const statusLabels: Record<QuestLogStatus, string> = {
	Playing: "Playing",
	Completed: "Completed",
	OnHold: "On Hold",
	Dropped: "Dropped",
	Backlog: "Backlog",
};

const statusColors: Record<QuestLogStatus, string> = {
	Playing: "bg-green-500",
	Completed: "bg-blue-500",
	OnHold: "bg-yellow-500",
	Dropped: "bg-red-500",
	Backlog: "bg-gray-500",
};

function QuestLogPage() {
	const { username } = Route.useParams();
	const { user: currentUser, isSignedIn } = useUser();
	const [entries, setEntries] = useState<QuestLogEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline");
	const [statusFilter, setStatusFilter] = useState<QuestLogStatus | "all">(
		"all",
	);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [profile, setProfile] = useState<Awaited<
		ReturnType<typeof getUserByUsername>
	> | null>(null);

	// Note: isOwnProfile could be used later for edit functionality
	// const isOwnProfile = isSignedIn && currentUser?.username === username;
	// Suppress unused variable warning
	void isSignedIn;
	void currentUser;

	useEffect(() => {
		const load = async () => {
			setIsLoading(true);
			try {
				const profileData = await getUserByUsername({ data: username });
				setProfile(profileData);

				if (viewMode === "timeline") {
					const data = await getQuestLogTimeline({ data: { username } });
					setEntries(data.entries);
				} else {
					const data = await getUserQuestLog({
						data: {
							username,
							status: statusFilter === "all" ? undefined : statusFilter,
						},
					});
					setEntries(data.entries);
				}
			} catch (error) {
				console.error("Failed to load quest log:", error);
			} finally {
				setIsLoading(false);
			}
		};
		load();
	}, [username, viewMode, statusFilter]);

	const filteredEntries =
		statusFilter === "all"
			? entries
			: entries.filter((e) => e.status === statusFilter);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-4">
						<Link
							to="/profile/$username"
							params={{ username }}
							className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
						>
							<ArrowLeft size={20} />
						</Link>
						<div>
							<h1 className="text-2xl font-bold text-white flex items-center gap-2">
								<Gamepad2 className="text-purple-400" />
								{profile?.displayName || profile?.username}'s Quest Log
							</h1>
							<p className="text-gray-400 text-sm">
								{entries.length} games logged
							</p>
						</div>
					</div>

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
					<TimelineView entries={filteredEntries} />
				) : (
					<GridView entries={filteredEntries} />
				)}
			</div>
		</div>
	);
}

// Timeline View Component
function TimelineView({ entries }: { entries: QuestLogEntry[] }) {
	return (
		<div className="space-y-4">
			{entries.map((entry) => (
				<Link
					key={entry.id}
					to="/games/$slug"
					params={{ slug: entry.game.slug }}
					className="block bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-purple-500/50 transition-all"
				>
					<div className="flex gap-4">
						{/* Game Cover */}
						<div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
							{entry.game.coverUrl ? (
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
									{entry.game.name}
								</h3>
								<span
									className={`px-2 py-0.5 text-xs font-medium rounded-full text-white ${statusColors[entry.status]}`}
								>
									{statusLabels[entry.status]}
								</span>
							</div>

							{entry.quickRating && (
								<div className="text-yellow-400 text-sm mb-1">
									{"⭐".repeat(Math.floor(entry.quickRating / 2))}
									{entry.quickRating % 2 ? "½" : ""} ({entry.quickRating}/10)
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
					</div>
				</Link>
			))}
		</div>
	);
}

// Grid View Component
function GridView({ entries }: { entries: QuestLogEntry[] }) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
			{entries.map((entry) => (
				<Link
					key={entry.id}
					to="/games/$slug"
					params={{ slug: entry.game.slug }}
					className="group relative"
				>
					<div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-800 border-2 border-transparent group-hover:border-purple-500 transition-all">
						{entry.game.coverUrl ? (
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
								{entry.game.name}
							</h3>
							<span className="text-xs text-gray-300">
								{statusLabels[entry.status]}
							</span>
							{entry.quickRating && (
								<span className="text-yellow-400 text-xs">
									{entry.quickRating}/10
								</span>
							)}
						</div>
					</div>
				</Link>
			))}
		</div>
	);
}
