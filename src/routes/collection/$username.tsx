import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	ArrowLeft,
	BookOpen,
	Calendar,
	ChevronDown,
	ChevronUp,
	Disc,
	Download,
	Gamepad2,
	Library,
	Pencil,
	Plus,
	Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CollectionGameSearchModal } from "../../components/collection/CollectionGameSearchModal";
import { EditCollectionModal } from "../../components/collection/EditCollectionModal";
import { HoursPlayedBadge } from "../../components/collection/HoursPlayedBadge";

type CollectionStatus =
	| "Unplayed"
	| "Playing"
	| "Beaten"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

type QuestLogStatus =
	| "Playing"
	| "Beaten"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

type OwnershipType = "Physical" | "Digital";

type SortOption = "platform" | "status" | "recent" | "alphabetical" | "rating";

export const Route = createFileRoute("/collection/$username")({
	component: CollectionPage,
});

const collectionStatusLabels: Record<CollectionStatus, string> = {
	Unplayed: "Unplayed",
	Playing: "Playing",
	Beaten: "Beaten",
	Completed: "Completed",
	OnHold: "On Hold",
	Dropped: "Dropped",
	Backlog: "Backlog",
};

const collectionStatusColors: Record<CollectionStatus, string> = {
	Unplayed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
	Playing: "bg-green-500/20 text-green-400 border-green-500/30",
	Beaten: "bg-blue-500/20 text-blue-400 border-blue-500/30",
	Completed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
	OnHold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
	Dropped: "bg-red-500/20 text-red-400 border-red-500/30",
	Backlog: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const collectionStatusEmojis: Record<CollectionStatus, string> = {
	Unplayed: "📦",
	Playing: "🎮",
	Beaten: "🏆",
	Completed: "💯",
	OnHold: "⏸️",
	Dropped: "❌",
	Backlog: "📚",
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
	Playing: "bg-green-500/20 text-green-400 border-green-500/30",
	Beaten: "bg-blue-500/20 text-blue-400 border-blue-500/30",
	Completed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
	OnHold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
	Dropped: "bg-red-500/20 text-red-400 border-red-500/30",
	Backlog: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusEmojis: Record<QuestLogStatus, string> = {
	Playing: "🎮",
	Beaten: "🏆",
	Completed: "💯",
	OnHold: "⏸️",
	Dropped: "❌",
	Backlog: "📚",
};

const collectionStatusOrder: CollectionStatus[] = [
	"Playing",
	"Beaten",
	"Completed",
	"Backlog",
	"OnHold",
	"Dropped",
	"Unplayed",
];

const sortOptions: { value: SortOption; label: string }[] = [
	{ value: "platform", label: "By Platform" },
	{ value: "status", label: "By Status" },
	{ value: "recent", label: "Recently Updated" },
	{ value: "alphabetical", label: "A-Z" },
	{ value: "rating", label: "By Rating" },
];

// Type definitions for collection data
type CollectionItem = {
	collection: {
		_id: string;
		ownershipType: OwnershipType;
		status: CollectionStatus | null;
		platform?: string;
		difficulty?: string;
		hoursPlayed?: number;
		acquiredAt?: number;
		updatedAt: number;
	};
	game: {
		_id: string;
		name: string;
		slug: string;
		coverUrl?: string;
		releaseDate?: number;
		genres: string[];
		platforms: string[];
	};
	playthroughs: PlaythroughItem[];
	latestRating: number | null;
	review: {
		_id: string;
		title: string;
		rating: number;
		published: boolean;
	} | null;
};

type PlaythroughItem = {
	_id: string;
	status: QuestLogStatus;
	platform?: string;
	difficulty?: string;
	startedAt?: number;
	completedAt?: number;
	quickRating?: number;
	hoursPlayed?: number;
	notes?: string;
	updatedAt: number;
};

function OwnershipBadge({ type }: { type: OwnershipType }) {
	if (type === "Physical") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
				<Disc size={12} />
				Physical
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
			<Download size={12} />
			Digital
		</span>
	);
}

function CollectionPage() {
	const { username } = Route.useParams();
	const { user: currentUser, isSignedIn } = useUser();
	const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
	const [showGameSearch, setShowGameSearch] = useState(false);
	const [sortBy, setSortBy] = useState<SortOption>("platform");
	const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);

	const isOwnProfile = isSignedIn && currentUser?.username === username;

	const profile = useQuery(api.users.getByUsername, { username });
	const collectionData = useQuery(api.collections.getUserCollection, {
		username,
	});
	const stats = useQuery(api.collections.getCollectionStats, { username });

	const games = (collectionData?.games ?? []) as CollectionItem[];

	// Sort and group games based on selected option
	const organizedGames = useMemo(() => {
		if (games.length === 0) return { groups: [], ungrouped: [] };

		const sortedGames = [...games];

		switch (sortBy) {
			case "platform": {
				// Group by platform
				const platformGroups = new Map<string, CollectionItem[]>();
				const noPlatform: CollectionItem[] = [];

				for (const item of sortedGames) {
					const platform = item.collection.platform;
					if (platform) {
						if (!platformGroups.has(platform)) {
							platformGroups.set(platform, []);
						}
						platformGroups.get(platform)?.push(item);
					} else {
						noPlatform.push(item);
					}
				}

				// Sort games within each group alphabetically
				for (const group of platformGroups.values()) {
					group.sort((a, b) => a.game.name.localeCompare(b.game.name));
				}
				noPlatform.sort((a, b) => a.game.name.localeCompare(b.game.name));

				// Sort platform groups by name
				const sortedPlatforms = Array.from(platformGroups.entries()).sort(
					(a, b) => a[0].localeCompare(b[0]),
				);

				const groups = sortedPlatforms.map(([name, items]) => ({
					name,
					items,
					color: "text-purple-400",
				}));

				if (noPlatform.length > 0) {
					groups.push({
						name: "No Platform Set",
						items: noPlatform,
						color: "text-gray-400",
					});
				}

				return { groups, ungrouped: [] };
			}

			case "status": {
				// Group by collection status
				const statusGroups = new Map<string, CollectionItem[]>();

				for (const item of sortedGames) {
					const status = item.collection.status || "Unplayed";
					if (!statusGroups.has(status)) {
						statusGroups.set(status, []);
					}
					statusGroups.get(status)?.push(item);
				}

				// Sort games within each group alphabetically
				for (const group of statusGroups.values()) {
					group.sort((a, b) => a.game.name.localeCompare(b.game.name));
				}

				// Order by status priority
				const groups = collectionStatusOrder
					.filter((status) => statusGroups.has(status))
					.map((status) => ({
						name: `${collectionStatusEmojis[status]} ${collectionStatusLabels[status]}`,
						items: statusGroups.get(status) ?? [],
						color: collectionStatusColors[status].split(" ")[1], // Get text color
					}));

				return { groups, ungrouped: [] };
			}

			case "recent":
				sortedGames.sort(
					(a, b) => b.collection.updatedAt - a.collection.updatedAt,
				);
				return { groups: [], ungrouped: sortedGames };

			case "alphabetical":
				sortedGames.sort((a, b) => a.game.name.localeCompare(b.game.name));
				return { groups: [], ungrouped: sortedGames };

			case "rating": {
				// Sort by rating (highest first), unrated at bottom
				sortedGames.sort((a, b) => {
					const ratingA = a.review?.rating || a.latestRating || 0;
					const ratingB = b.review?.rating || b.latestRating || 0;
					if (ratingA === ratingB) {
						return a.game.name.localeCompare(b.game.name);
					}
					return ratingB - ratingA;
				});
				return { groups: [], ungrouped: sortedGames };
			}

			default:
				return { groups: [], ungrouped: sortedGames };
		}
	}, [games, sortBy]);

	const toggleExpanded = (gameId: string) => {
		setExpandedGames((prev) => {
			const next = new Set(prev);
			if (next.has(gameId)) {
				next.delete(gameId);
			} else {
				next.add(gameId);
			}
			return next;
		});
	};

	const formatDate = (timestamp: number | undefined) => {
		if (!timestamp) return null;
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const renderGameCard = (item: CollectionItem) => {
		const isExpanded = expandedGames.has(item.game._id);
		const displayRating = item.review?.rating || item.latestRating;
		const hours = item.collection.hoursPlayed ?? 0;
		const releaseYear = item.game.releaseDate
			? new Date(item.game.releaseDate).getFullYear()
			: null;

		return (
			<div
				key={item.game._id}
				className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
			>
				{/* Game Header */}
				<div className="flex gap-4 p-4">
					{/* Cover */}
					<Link
						to="/games/$slug"
						params={{ slug: item.game.slug }}
						className="flex-shrink-0"
					>
						<div className="w-24 h-32 rounded-lg overflow-hidden bg-gray-700 shadow-lg">
							{item.game.coverUrl ? (
								<img
									src={item.game.coverUrl}
									alt={item.game.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-gray-500">
									<Gamepad2 size={32} />
								</div>
							)}
						</div>
					</Link>

					{/* Info */}
					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<Link
									to="/games/$slug"
									params={{ slug: item.game.slug }}
									className="block"
								>
									<h3 className="font-semibold text-white truncate hover:text-purple-400 transition-colors">
										{item.game.name}
									</h3>
								</Link>
								{releaseYear && (
									<p className="text-xs text-gray-500">{releaseYear}</p>
								)}
							</div>

							{/* Edit Button */}
							{isOwnProfile && (
								<button
									type="button"
									onClick={() => setEditingItem(item)}
									className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
									title="Edit"
								>
									<Pencil size={14} />
								</button>
							)}
						</div>

						{/* Badges Row */}
						<div className="flex items-center gap-2 mt-2 flex-wrap">
							<OwnershipBadge type={item.collection.ownershipType} />

							{item.collection.status && (
								<span
									className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${collectionStatusColors[item.collection.status]}`}
								>
									{collectionStatusEmojis[item.collection.status]}
									{collectionStatusLabels[item.collection.status]}
								</span>
							)}
						</div>

						{/* Rating */}
						{displayRating && (
							<div className="flex items-center gap-1 mt-2">
								{[1, 2, 3, 4, 5].map((star) => (
									<Star
										key={star}
										size={14}
										className={
											star <= displayRating
												? "text-yellow-400 fill-yellow-400"
												: "text-gray-600"
										}
									/>
								))}
								<span className="text-xs text-gray-500 ml-1">
									{displayRating}/5
								</span>
							</div>
						)}

						{/* Meta info row */}
						<div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
							{item.collection.platform && (
								<span className="flex items-center gap-1">
									<Gamepad2 size={12} />
									{item.collection.platform}
								</span>
							)}
							{item.collection.difficulty && (
								<span>Difficulty: {item.collection.difficulty}</span>
							)}
							{hours > 0 && <HoursPlayedBadge hours={hours} size="sm" />}
							{item.collection.acquiredAt && (
								<span className="flex items-center gap-1">
									<Calendar size={12} />
									{formatDate(item.collection.acquiredAt)}
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2 px-4 pb-3">
					{/* Expand Playthroughs */}
					{item.playthroughs.length > 0 && (
						<button
							type="button"
							onClick={() => toggleExpanded(item.game._id)}
							className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
						>
							{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
							{item.playthroughs.length} playthrough
							{item.playthroughs.length !== 1 ? "s" : ""}
						</button>
					)}

					{item.playthroughs.length === 0 && (
						<span className="text-xs text-gray-500">
							No playthroughs logged
						</span>
					)}

					<div className="flex-1" />

					{/* Review Link */}
					{item.review ? (
						<Link
							to="/reviews/$id"
							params={{ id: item.review._id }}
							className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
						>
							<BookOpen size={14} />
							View Review
						</Link>
					) : isOwnProfile && item.latestRating ? (
						<Link
							to="/reviews/new"
							search={{
								gameId: item.game._id,
								rating: item.latestRating,
							}}
							className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
						>
							<Pencil size={14} />
							Write Review
						</Link>
					) : isOwnProfile ? (
						<Link
							to="/reviews/new"
							search={{ gameId: item.game._id }}
							className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
						>
							<Pencil size={14} />
							Write Review
						</Link>
					) : null}
				</div>

				{/* Expanded Playthrough History */}
				{isExpanded && item.playthroughs.length > 0 && (
					<div className="border-t border-gray-700/50 p-4 space-y-3">
						<h4 className="text-sm font-medium text-gray-400 mb-2">
							Playthrough History
						</h4>

						{item.playthroughs.map((playthrough: PlaythroughItem) => (
							<div
								key={playthrough._id}
								className="bg-gray-900/50 rounded-lg p-3"
							>
								<div className="flex items-center justify-between mb-2">
									<span
										className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[playthrough.status as QuestLogStatus]}`}
									>
										{statusEmojis[playthrough.status as QuestLogStatus]}
										{statusLabels[playthrough.status as QuestLogStatus]}
									</span>
									{playthrough.quickRating && (
										<div className="flex items-center gap-0.5">
											{[1, 2, 3, 4, 5].map((star) => (
												<Star
													key={star}
													size={12}
													className={
														star <= (playthrough.quickRating ?? 0)
															? "text-yellow-400 fill-yellow-400"
															: "text-gray-600"
													}
												/>
											))}
										</div>
									)}
								</div>

								<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
									{playthrough.platform && (
										<p>
											<span className="text-gray-600">Platform:</span>{" "}
											{playthrough.platform}
										</p>
									)}
									{playthrough.difficulty && (
										<p>
											<span className="text-gray-600">Difficulty:</span>{" "}
											{playthrough.difficulty}
										</p>
									)}
									{playthrough.startedAt && (
										<p>
											<span className="text-gray-600">Started:</span>{" "}
											{formatDate(playthrough.startedAt)}
										</p>
									)}
									{playthrough.completedAt && (
										<p>
											<span className="text-gray-600">Finished:</span>{" "}
											{formatDate(playthrough.completedAt)}
										</p>
									)}
									{playthrough.hoursPlayed && (
										<p>
											<span className="text-gray-600">Hours:</span>{" "}
											{playthrough.hoursPlayed}h
										</p>
									)}
								</div>

								{playthrough.notes && (
									<p className="text-sm text-gray-400 mt-2 line-clamp-2">
										{playthrough.notes}
									</p>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
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
								<Library className="text-purple-400" />
								{profile?.displayName || profile?.username}'s Collection
							</h1>
							<p className="text-gray-400 text-sm">
								{games.length} game{games.length !== 1 ? "s" : ""} owned
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
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

						{/* Link to Quest Log */}
						<Link
							to="/questlog/$username"
							params={{ username }}
							className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-lg transition-colors"
						>
							<Gamepad2 size={18} />
							Quest Log
						</Link>
					</div>
				</div>

				{/* Stats */}
				{stats && stats.totalOwned > 0 && (
					<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
						<div className="bg-purple-500/10 rounded-lg p-3 text-center border border-purple-500/20">
							<p className="text-2xl font-bold text-purple-400">
								{stats.totalOwned}
							</p>
							<p className="text-xs text-gray-400">Owned</p>
						</div>
						<div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
							<p className="text-2xl font-bold text-green-400">
								{stats.playing}
							</p>
							<p className="text-xs text-gray-400">Playing</p>
						</div>
						<div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
							<p className="text-2xl font-bold text-blue-400">{stats.beaten}</p>
							<p className="text-xs text-gray-400">Beaten</p>
						</div>
						<div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/20">
							<p className="text-2xl font-bold text-amber-400">
								{stats.completed}
							</p>
							<p className="text-xs text-gray-400">Completed</p>
						</div>
						<div className="bg-gray-500/10 rounded-lg p-3 text-center border border-gray-500/20">
							<p className="text-2xl font-bold text-gray-400">
								{stats.backlog}
							</p>
							<p className="text-xs text-gray-400">Backlog</p>
						</div>
						<div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/20">
							<p className="text-2xl font-bold text-yellow-400">
								{stats.onHold}
							</p>
							<p className="text-xs text-gray-400">On Hold</p>
						</div>
						<div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
							<p className="text-2xl font-bold text-red-400">{stats.dropped}</p>
							<p className="text-xs text-gray-400">Dropped</p>
						</div>
						<div className="bg-slate-500/10 rounded-lg p-3 text-center border border-slate-500/20">
							<p className="text-2xl font-bold text-slate-400">
								{stats.unplayed}
							</p>
							<p className="text-xs text-gray-400">Unplayed</p>
						</div>
					</div>
				)}

				{/* Sort Options */}
				{games.length > 0 && (
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-2">
							<span className="text-sm text-gray-400">Sort by:</span>
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as SortOption)}
								className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
							>
								{sortOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>
				)}

				{/* Collection Grid */}
				{collectionData === undefined ? (
					<div className="flex justify-center py-12">
						<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : games.length === 0 ? (
					<div className="text-center py-12 text-gray-500">
						<Library size={48} className="mx-auto mb-4 opacity-50" />
						<p>No games in collection yet</p>
						{isOwnProfile && (
							<p className="mt-2 text-sm">
								Click "Add Game" to start building your library
							</p>
						)}
					</div>
				) : organizedGames.groups.length > 0 ? (
					// Grouped view (Platform or Status)
					<div className="space-y-8">
						{organizedGames.groups.map((group) => (
							<div key={group.name}>
								<h2
									className={`text-lg font-semibold mb-4 flex items-center gap-2 ${group.color}`}
								>
									{group.name}
									<span className="text-sm font-normal text-gray-500">
										({group.items.length})
									</span>
								</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
									{group.items.map(renderGameCard)}
								</div>
							</div>
						))}
					</div>
				) : (
					// Ungrouped view (Recent, Alphabetical, Rating)
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{organizedGames.ungrouped.map(renderGameCard)}
					</div>
				)}
			</div>

			{/* Game Search Modal */}
			{isOwnProfile && currentUser && (
				<CollectionGameSearchModal
					isOpen={showGameSearch}
					onClose={() => setShowGameSearch(false)}
					onSuccess={() => {
						// Convex reactivity handles refresh
					}}
					clerkId={currentUser.id}
				/>
			)}

			{/* Edit Collection Modal */}
			{editingItem && currentUser && (
				<EditCollectionModal
					isOpen={true}
					onClose={() => setEditingItem(null)}
					onSuccess={() => setEditingItem(null)}
					onRemove={() => setEditingItem(null)}
					clerkId={currentUser.id}
					collectionId={editingItem.collection._id}
					gameName={editingItem.game.name}
					gamePlatforms={editingItem.game.platforms}
					currentOwnershipType={editingItem.collection.ownershipType}
					currentStatus={editingItem.collection.status}
					currentPlatform={editingItem.collection.platform}
					currentDifficulty={editingItem.collection.difficulty}
					currentHoursPlayed={editingItem.collection.hoursPlayed}
					currentAcquiredAt={editingItem.collection.acquiredAt}
				/>
			)}
		</div>
	);
}
