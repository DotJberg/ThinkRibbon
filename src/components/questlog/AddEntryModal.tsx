import { useMutation } from "convex/react";
import { Calendar, Loader2, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type QuestLogStatus =
	| "Playing"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

interface AddEntryModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	clerkId: string;
	gameId: string;
	gameName: string;
}

const statusOptions: { value: QuestLogStatus; label: string; emoji: string }[] =
	[
		{ value: "Playing", label: "Playing", emoji: "🎮" },
		{ value: "Completed", label: "Completed", emoji: "🏆" },
		{ value: "OnHold", label: "On Hold", emoji: "⏸️" },
		{ value: "Dropped", label: "Dropped", emoji: "❌" },
		{ value: "Backlog", label: "Backlog", emoji: "📚" },
	];

export function AddEntryModal({
	isOpen,
	onClose,
	onSuccess,
	clerkId,
	gameId,
	gameName,
}: AddEntryModalProps) {
	const addEntry = useMutation(api.questlog.add);
	const [status, setStatus] = useState<QuestLogStatus>("Playing");
	const [startedAt, setStartedAt] = useState<string>(
		new Date().toISOString().split("T")[0],
	);
	const [completedAt, setCompletedAt] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const startedId = useId();
	const completedId = useId();

	if (!isOpen) return null;

	const showCompletedDate = status === "Completed" || status === "Dropped";

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			await addEntry({
				clerkId,
				gameId: gameId as Id<"games">,
				status,
				startedAt: startedAt ? new Date(startedAt).getTime() : undefined,
				completedAt:
					showCompletedDate && completedAt
						? new Date(completedAt).getTime()
						: undefined,
			});

			onSuccess?.();
			onClose();
		} catch (error) {
			console.error("Failed to add to quest log:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-800">
					<h2 className="text-lg font-bold text-white flex items-center gap-2">
						<Plus size={20} className="text-purple-400" />
						Add to Quest Log
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
					>
						<X size={18} />
					</button>
				</div>

				<div className="p-5 space-y-5">
					{/* Game Name */}
					<div className="text-center">
						<p className="text-gray-400 text-sm">Adding entry for</p>
						<p className="text-white font-semibold text-lg">{gameName}</p>
					</div>

					{/* Status Selection */}
					<div className="space-y-2">
						<span className="text-sm font-medium text-gray-400">Status</span>
						<div className="grid grid-cols-2 gap-2">
							{statusOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setStatus(option.value)}
									className={`p-3 rounded-lg border text-left transition-all ${
										status === option.value
											? "border-purple-500 bg-purple-500/10 text-white"
											: "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
									}`}
								>
									<span className="mr-2">{option.emoji}</span>
									{option.label}
								</button>
							))}
						</div>
					</div>

					{/* Date Pickers */}
					<div className="space-y-3">
						{/* Started Date */}
						<div className="space-y-1">
							<label
								htmlFor={startedId}
								className="text-sm font-medium text-gray-400 flex items-center gap-2"
							>
								<Calendar size={14} />
								Started Date
							</label>
							<input
								id={startedId}
								type="date"
								value={startedAt}
								onChange={(e) => setStartedAt(e.target.value)}
								className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
							/>
						</div>

						{/* Completed/Dropped Date */}
						{showCompletedDate && (
							<div className="space-y-1">
								<label
									htmlFor={completedId}
									className="text-sm font-medium text-gray-400 flex items-center gap-2"
								>
									<Calendar size={14} />
									{status === "Completed" ? "Completed" : "Dropped"} Date
								</label>
								<input
									id={completedId}
									type="date"
									value={completedAt}
									onChange={(e) => setCompletedAt(e.target.value)}
									className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
								/>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="p-5 border-t border-gray-800 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={isSubmitting}
						className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					>
						{isSubmitting && <Loader2 size={16} className="animate-spin" />}
						Add Entry
					</button>
				</div>
			</div>
		</div>
	);
}
