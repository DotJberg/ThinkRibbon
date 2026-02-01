import { useUser } from "@clerk/clerk-react";
import { BookOpen, Check, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { QuestLogStatus } from "../../generated/prisma/client.js";
import { addToQuestLog, getQuestLogEntry } from "../../lib/server/questlog";
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
	const [isAdding, setIsAdding] = useState(false);
	const [showModal, setShowModal] = useState(false);

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

	const handleAdd = async () => {
		if (!user?.id) return;
		setIsAdding(true);
		try {
			const newEntry = await addToQuestLog({
				data: {
					clerkId: user.id,
					gameId,
					status: "Playing",
				},
			});
			setEntry(newEntry);
			onUpdate?.();
		} catch (error) {
			console.error("Failed to add to quest log:", error);
		} finally {
			setIsAdding(false);
		}
	};

	const handleModalSuccess = async () => {
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
			<button
				type="button"
				onClick={handleAdd}
				disabled={isAdding}
				className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg shadow-lg transition-all disabled:opacity-50"
			>
				{isAdding ? (
					<Loader2 size={18} className="animate-spin" />
				) : (
					<Plus size={18} />
				)}
				Add to Quest Log
			</button>
		);
	}

	// In quest log - show status with click to change
	return (
		<>
			<button
				type="button"
				onClick={() => setShowModal(true)}
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
						{"⭐".repeat(Math.floor(entry.quickRating / 2))}
					</span>
				)}
			</button>

			<StatusChangeModal
				isOpen={showModal}
				onClose={() => setShowModal(false)}
				onSuccess={handleModalSuccess}
				clerkId={user.id}
				gameId={gameId}
				gameName={gameName}
				currentStatus={entry.status}
			/>
		</>
	);
}
