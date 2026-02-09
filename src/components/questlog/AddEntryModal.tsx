import { useMutation } from "convex/react";
import { Calendar, Loader2, Monitor, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type QuestLogStatus =
	| "Playing"
	| "Beaten"
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
	gamePlatforms?: string[];
}

const statusOptions: { value: QuestLogStatus; label: string; emoji: string }[] =
	[
		{ value: "Playing", label: "Playing", emoji: "🎮" },
		{ value: "Beaten", label: "Beaten", emoji: "🏆" },
		{ value: "Completed", label: "100% Complete", emoji: "💯" },
		{ value: "OnHold", label: "On Hold", emoji: "⏸️" },
		{ value: "Dropped", label: "Dropped", emoji: "❌" },
		{ value: "Backlog", label: "Backlog", emoji: "📚" },
	];

const difficultySuggestions = [
	"Story Mode",
	"Easy",
	"Normal",
	"Hard",
	"Hardest",
	"No Difficulty",
];

export function AddEntryModal({
	isOpen,
	onClose,
	onSuccess,
	clerkId,
	gameId,
	gameName,
	gamePlatforms = [],
}: AddEntryModalProps) {
	const addEntry = useMutation(api.questlog.add);
	const [status, setStatus] = useState<QuestLogStatus>("Playing");
	const [platform, setPlatform] = useState<string>("");
	const [difficulty, setDifficulty] = useState<string>("");
	const [startedAt, setStartedAt] = useState<string>(
		new Date().toISOString().split("T")[0],
	);
	const [completedAt, setCompletedAt] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const startedId = useId();
	const completedId = useId();
	const platformId = useId();
	const difficultyId = useId();
	const difficultyListId = useId();

	if (!isOpen) return null;

	const showCompletedDate =
		status === "Beaten" || status === "Completed" || status === "Dropped";

	const handleSubmit = async () => {
		setIsSubmitting(true);
		setError(null);
		try {
			await addEntry({
				clerkId,
				gameId: gameId as Id<"games">,
				status,
				platform: platform || undefined,
				difficulty: difficulty || undefined,
				startedAt: startedAt ? new Date(startedAt).getTime() : undefined,
				completedAt:
					showCompletedDate && completedAt
						? new Date(completedAt).getTime()
						: undefined,
			});

			onSuccess?.();
			onClose();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to add to quest log";
			setError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-md max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-800">
					<h2 className="text-lg font-bold text-white flex items-center gap-2">
						<Plus size={20} className="text-slate-400" />
						Log Playthrough
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
					>
						<X size={18} />
					</button>
				</div>

				<div className="p-5 space-y-5 overflow-y-auto flex-1">
					{/* Game Name */}
					<div className="text-center">
						<p className="text-gray-400 text-sm">Logging playthrough for</p>
						<p className="text-white font-semibold text-lg">{gameName}</p>
					</div>

					{/* Error Message */}
					{error && (
						<div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
							{error}
						</div>
					)}

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
											? "border-slate-500 bg-slate-500/10 text-white"
											: "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
									}`}
								>
									<span className="mr-2">{option.emoji}</span>
									{option.label}
								</button>
							))}
						</div>
					</div>

					{/* Platform Selection */}
					{gamePlatforms.length > 0 && (
						<div className="space-y-2">
							<label
								htmlFor={platformId}
								className="text-sm font-medium text-gray-400 flex items-center gap-2"
							>
								<Monitor size={14} />
								Platform Played On
							</label>
							<select
								id={platformId}
								value={platform}
								onChange={(e) => setPlatform(e.target.value)}
								className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-slate-500 transition-colors"
							>
								<option value="">Select platform...</option>
								{gamePlatforms.map((p) => (
									<option key={p} value={p}>
										{p}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Difficulty */}
					<div className="space-y-2">
						<label
							htmlFor={difficultyId}
							className="text-sm font-medium text-gray-400"
						>
							Difficulty (Optional)
						</label>
						<input
							id={difficultyId}
							type="text"
							value={difficulty}
							onChange={(e) => setDifficulty(e.target.value)}
							placeholder="e.g., Hard, Normal, Story Mode"
							list={difficultyListId}
							className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-slate-500 transition-colors"
						/>
						<datalist id={difficultyListId}>
							{difficultySuggestions.map((d) => (
								<option key={d} value={d} />
							))}
						</datalist>
						<div className="flex flex-wrap gap-1">
							{difficultySuggestions.slice(0, 4).map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => setDifficulty(d)}
									className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
										difficulty === d
											? "bg-slate-700 text-white"
											: "bg-gray-700 text-gray-400 hover:text-white"
									}`}
								>
									{d}
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
								className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-slate-500 transition-colors"
							/>
						</div>

						{/* Completed/Dropped/Beaten Date */}
						{showCompletedDate && (
							<div className="space-y-1">
								<label
									htmlFor={completedId}
									className="text-sm font-medium text-gray-400 flex items-center gap-2"
								>
									<Calendar size={14} />
									{status === "Beaten"
										? "Finished"
										: status === "Completed"
											? "Completed"
											: "Dropped"}{" "}
									Date
								</label>
								<input
									id={completedId}
									type="date"
									value={completedAt}
									onChange={(e) => setCompletedAt(e.target.value)}
									className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-slate-500 transition-colors"
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
						className="px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					>
						{isSubmitting && <Loader2 size={16} className="animate-spin" />}
						Log Playthrough
					</button>
				</div>
			</div>
		</div>
	);
}
