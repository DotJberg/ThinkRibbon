import { useMutation, useQuery } from "convex/react";
import {
	Calendar,
	Clock,
	Gamepad2,
	Loader2,
	Monitor,
	Package,
	ScrollText,
	X,
} from "lucide-react";
import { useId, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AddEntryModal } from "../questlog/AddEntryModal";

type OwnershipType = "Physical" | "Digital";
type CollectionStatus =
	| "Unplayed"
	| "Playing"
	| "Beaten"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

interface AddToCollectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	clerkId: string;
	gameId: string;
	gameName: string;
	gamePlatforms?: string[];
}

const ownershipOptions: {
	value: OwnershipType;
	label: string;
	icon: string;
}[] = [
	{ value: "Physical", label: "Physical", icon: "💿" },
	{ value: "Digital", label: "Digital", icon: "☁️" },
];

const statusOptions: {
	value: CollectionStatus;
	label: string;
	emoji: string;
	description: string;
}[] = [
	{
		value: "Unplayed",
		label: "Unplayed",
		emoji: "📦",
		description: "Haven't started yet",
	},
	{
		value: "Backlog",
		label: "Backlog",
		emoji: "📚",
		description: "Planning to play",
	},
	{
		value: "Playing",
		label: "Playing",
		emoji: "🎮",
		description: "Currently playing",
	},
	{
		value: "Beaten",
		label: "Beaten",
		emoji: "🏆",
		description: "Finished the main game",
	},
	{
		value: "Completed",
		label: "Completed",
		emoji: "💯",
		description: "Fully completed",
	},
	{
		value: "OnHold",
		label: "On Hold",
		emoji: "⏸️",
		description: "Paused for now",
	},
	{
		value: "Dropped",
		label: "Dropped",
		emoji: "❌",
		description: "Stopped playing",
	},
];

const difficultySuggestions = [
	"None",
	"Story Mode",
	"Easy",
	"Normal",
	"Hard",
	"Hardest",
];

export function AddToCollectionModal({
	isOpen,
	onClose,
	onSuccess,
	clerkId,
	gameId,
	gameName,
	gamePlatforms = [],
}: AddToCollectionModalProps) {
	const addToCollection = useMutation(api.collections.add);
	const existingQuestLogEntry = useQuery(
		api.questlog.getEntry,
		gameId ? { clerkId, gameId } : "skip",
	);
	const [ownershipType, setOwnershipType] = useState<OwnershipType>("Digital");
	const [status, setStatus] = useState<CollectionStatus>("Unplayed");
	const [platform, setPlatform] = useState<string>("");
	const [difficulty, setDifficulty] = useState<string>("");
	const [hoursPlayed, setHoursPlayed] = useState<string>("");
	const [acquiredAt, setAcquiredAt] = useState<string>(
		new Date().toISOString().split("T")[0],
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showQuestLogPrompt, setShowQuestLogPrompt] = useState(false);
	const [showQuestLogModal, setShowQuestLogModal] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const platformId = useId();
	const difficultyId = useId();
	const difficultyListId = useId();
	const hoursPlayedId = useId();
	const acquiredId = useId();

	if (!isOpen) return null;

	const handleSubmit = async () => {
		setIsSubmitting(true);
		setError(null);
		try {
			await addToCollection({
				clerkId,
				gameId: gameId as Id<"games">,
				ownershipType,
				status,
				platform: platform || undefined,
				difficulty: difficulty || undefined,
				hoursPlayed: hoursPlayed ? Number(hoursPlayed) : undefined,
				acquiredAt: acquiredAt ? new Date(acquiredAt).getTime() : undefined,
			});

			// If status is Playing, prompt to add to Quest Log before calling onSuccess
			if (status === "Playing" && !existingQuestLogEntry) {
				setShowQuestLogPrompt(true);
			} else {
				onSuccess?.();
				onClose();
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to add to collection";
			setError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleAddToQuestLog = () => {
		setShowQuestLogPrompt(false);
		setShowQuestLogModal(true);
	};

	const handleQuestLogSuccess = () => {
		setShowQuestLogModal(false);
		onSuccess?.();
		onClose();
	};

	const handleQuestLogClose = () => {
		// If they close the quest log modal, still complete the collection flow
		setShowQuestLogModal(false);
		onSuccess?.();
		onClose();
	};

	const handleSkipQuestLog = () => {
		onSuccess?.();
		onClose();
	};

	// Quest Log Prompt after adding with "Playing" status
	if (showQuestLogPrompt) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
				<div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
					{/* Header */}
					<div className="flex items-center justify-between p-5 border-b border-gray-800">
						<h2 className="text-lg font-bold text-white flex items-center gap-2">
							<ScrollText size={20} className="text-green-400" />
							Track in Quest Log?
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
						>
							<X size={18} />
						</button>
					</div>

					<div className="p-5 space-y-4">
						{/* Success message */}
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-3">
								<Package size={24} className="text-green-400" />
							</div>
							<p className="text-white font-semibold">{gameName}</p>
							<p className="text-green-400 text-sm">
								Added to your collection!
							</p>
						</div>

						{/* Prompt */}
						<div className="bg-gray-800/50 rounded-lg p-4 text-center">
							<p className="text-gray-300 mb-1">
								Want to track your playthrough in your Quest Log?
							</p>
							<p className="text-gray-500 text-sm">
								You can set your start date and other details.
							</p>
						</div>
					</div>

					{/* Footer */}
					<div className="p-5 border-t border-gray-800 flex gap-3">
						<button
							type="button"
							onClick={handleSkipQuestLog}
							className="flex-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
						>
							Skip
						</button>
						<button
							type="button"
							onClick={handleAddToQuestLog}
							className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all"
						>
							<ScrollText size={16} />
							Add to Quest Log
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Show Quest Log modal
	if (showQuestLogModal) {
		return (
			<AddEntryModal
				isOpen={true}
				onClose={handleQuestLogClose}
				onSuccess={handleQuestLogSuccess}
				clerkId={clerkId}
				gameId={gameId}
				gameName={gameName}
				gamePlatforms={gamePlatforms}
			/>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-md max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-800">
					<h2 className="text-lg font-bold text-white flex items-center gap-2">
						<Package size={20} className="text-purple-400" />
						Add to Collection
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
						<p className="text-gray-400 text-sm">Adding to collection</p>
						<p className="text-white font-semibold text-lg">{gameName}</p>
					</div>

					{/* Error Message */}
					{error && (
						<div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
							{error}
						</div>
					)}

					{/* Ownership Type */}
					<div className="space-y-2">
						<span className="text-sm font-medium text-gray-400">
							How do you own this game?
						</span>
						<div className="flex gap-2">
							{ownershipOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setOwnershipType(option.value)}
									className={`flex-1 p-3 rounded-lg border text-center transition-all ${
										ownershipType === option.value
											? "border-purple-500 bg-purple-500/10 text-white"
											: "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
									}`}
								>
									<span className="mr-1 text-lg">{option.icon}</span>
									<span className="block text-sm mt-1">{option.label}</span>
								</button>
							))}
						</div>
					</div>

					{/* Play Status */}
					<div className="space-y-2">
						<span className="text-sm font-medium text-gray-400 flex items-center gap-2">
							<Gamepad2 size={14} />
							Play Status
						</span>
						<div className="grid grid-cols-2 gap-2">
							{statusOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setStatus(option.value)}
									className={`p-2 rounded-lg border text-left transition-all ${
										status === option.value
											? "border-purple-500 bg-purple-500/10"
											: "border-gray-700 bg-gray-800 hover:border-gray-600"
									}`}
								>
									<div className="flex items-center gap-2">
										<span className="text-base">{option.emoji}</span>
										<div className="min-w-0">
											<span
												className={`block text-sm font-medium ${status === option.value ? "text-white" : "text-gray-300"}`}
											>
												{option.label}
											</span>
											<span className="block text-xs text-gray-500 truncate">
												{option.description}
											</span>
										</div>
									</div>
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
								Platform Owned On
							</label>
							<select
								id={platformId}
								value={platform}
								onChange={(e) => setPlatform(e.target.value)}
								className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
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
							className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
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
											? "bg-purple-600 text-white"
											: "bg-gray-700 text-gray-400 hover:text-white"
									}`}
								>
									{d}
								</button>
							))}
						</div>
					</div>

					{/* Hours Played */}
					<div className="space-y-2">
						<label
							htmlFor={hoursPlayedId}
							className="text-sm font-medium text-gray-400 flex items-center gap-2"
						>
							<Clock size={14} />
							Hours Played (Optional)
						</label>
						<input
							id={hoursPlayedId}
							type="number"
							min="0"
							step="1"
							value={hoursPlayed}
							onChange={(e) => setHoursPlayed(e.target.value)}
							placeholder="e.g., 50"
							className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
						/>
					</div>

					{/* Acquired Date */}
					<div className="space-y-2">
						<label
							htmlFor={acquiredId}
							className="text-sm font-medium text-gray-400 flex items-center gap-2"
						>
							<Calendar size={14} />
							When did you get it? (Optional)
						</label>
						<input
							id={acquiredId}
							type="date"
							value={acquiredAt}
							onChange={(e) => setAcquiredAt(e.target.value)}
							className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
						/>
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
						Add to Collection
					</button>
				</div>
			</div>
		</div>
	);
}
