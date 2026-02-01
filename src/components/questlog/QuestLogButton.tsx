import { useUser } from "@clerk/clerk-react";
import { BookOpen, Check, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { QuestLogStatus } from "../../generated/prisma/client.js";
import { getQuestLogEntry } from "../../lib/server/questlog";
import { AddEntryModal } from "./AddEntryModal";
import { StatusChangeModal } from "./StatusChangeModal";

interface QuestLogButtonProps {
	gameId: string;
	gameName: string;
	onUpdate?: () => void;
}

type QuestLogEntry = Awaited<ReturnType<typeof getQuestLogEntry>>;

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
	const [entry, setEntry] = useState<QuestLogEntry>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showStatusModal, setShowStatusModal] = useState(false);

	useEffect(() => {
		const load = async () => {
			if (!user?.id) {
				setIsLoading(false);
				return;
			}
			try {
				const data = await getQuestLogEntry({
					data: { clerkId: user.id, gameId },
				});
				setEntry(data);
			} catch (error) {
				console.error("Failed to load quest log entry:", error);
			} finally {
				setIsLoading(false);
			}
		};
		load();
	}, [user?.id, gameId]);

	const handleAddSuccess = async () => {
		// Refresh the entry
		if (user?.id) {
			const updated = await getQuestLogEntry({
				data: { clerkId: user.id, gameId },
			});
			setEntry(updated);
		}
		onUpdate?.();
	};

	const handleStatusSuccess = async () => {
		// Refresh the entry
		if (user?.id) {
			const updated = await getQuestLogEntry({
				data: { clerkId: user.id, gameId },
			});
			setEntry(updated);
		}
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
				questLogId={entry.id}
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

