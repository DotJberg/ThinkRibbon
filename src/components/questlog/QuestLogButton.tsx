import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { BookOpen, Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type QuestLogStatus =
	| "Playing"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

import { AddEntryModal } from "./AddEntryModal";
import { StatusChangeModal } from "./StatusChangeModal";

interface QuestLogButtonProps {
	gameId: string;
	gameName: string;
	onUpdate?: () => void;
}

const statusLabels: Record<QuestLogStatus, string> = {
	Playing: "Playing",
	Completed: "Completed",
	OnHold: "On Hold",
	Dropped: "Dropped",
	Backlog: "Backlog",
};

const statusColors: Record<QuestLogStatus, string> = {
	Playing: "from-green-600 to-green-500",
	Completed: "from-blue-600 to-blue-500",
	OnHold: "from-yellow-600 to-yellow-500",
	Dropped: "from-red-600 to-red-500",
	Backlog: "from-gray-600 to-gray-500",
};

export function QuestLogButton({
	gameId,
	gameName,
	onUpdate,
}: QuestLogButtonProps) {
	const { user, isSignedIn } = useUser();
	const entry = useQuery(
		api.questlog.getEntry,
		user?.id ? { clerkId: user.id, gameId: gameId as Id<"games"> } : "skip",
	);
	const isLoading = entry === undefined;
	const [showAddModal, setShowAddModal] = useState(false);
	const [showStatusModal, setShowStatusModal] = useState(false);

	const handleAddSuccess = () => {
		onUpdate?.();
	};

	const handleStatusSuccess = () => {
		onUpdate?.();
	};

	if (!isSignedIn) {
		return null;
	}

	if (isLoading) {
		return (
			<button
				type="button"
				disabled
				className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg"
			>
				<Loader2 size={18} className="animate-spin" />
				Loading...
			</button>
		);
	}

	// Not in quest log - show add button
	if (!entry) {
		return (
			<>
				<button
					type="button"
					onClick={() => setShowAddModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg shadow-lg transition-all"
				>
					<Plus size={18} />
					Add to Quest Log
				</button>

				<AddEntryModal
					isOpen={showAddModal}
					onClose={() => setShowAddModal(false)}
					onSuccess={handleAddSuccess}
					clerkId={user.id}
					gameId={gameId}
					gameName={gameName}
				/>
			</>
		);
	}

	// In quest log - show status with click to change + add new entry button
	return (
		<>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setShowStatusModal(true)}
					className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${statusColors[entry.status]} text-white font-medium rounded-lg shadow-lg hover:opacity-90 transition-all`}
				>
					{entry.status === "Completed" ? (
						<Check size={18} />
					) : (
						<BookOpen size={18} />
					)}
					{statusLabels[entry.status]}
					{entry.quickRating && (
						<span className="ml-1 text-yellow-300">
							{"⭐".repeat(entry.quickRating)}
						</span>
					)}
				</button>

				{/* Add New Entry button for diary-style logging */}
				<button
					type="button"
					onClick={() => setShowAddModal(true)}
					className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-lg transition-all"
					title="Log another playthrough"
				>
					<Plus size={16} />
				</button>
			</div>

			<StatusChangeModal
				isOpen={showStatusModal}
				onClose={() => setShowStatusModal(false)}
				onSuccess={handleStatusSuccess}
				clerkId={user.id}
				gameId={gameId}
				gameName={gameName}
				currentStatus={entry.status}
				questLogId={entry._id}
				currentStartedAt={entry.startedAt}
				currentCompletedAt={entry.completedAt}
			/>

			<AddEntryModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				onSuccess={handleAddSuccess}
				clerkId={user.id}
				gameId={gameId}
				gameName={gameName}
			/>
		</>
	);
}
