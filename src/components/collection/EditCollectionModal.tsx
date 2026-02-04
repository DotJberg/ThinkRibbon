import { useMutation } from "convex/react";
import {
	Calendar,
	Gamepad2,
	Loader2,
	Monitor,
	Package,
	Trash2,
	X,
} from "lucide-react";
import { useId, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type OwnershipType = "Physical" | "Digital";
type CollectionStatus =
	| "Unplayed"
	| "Playing"
	| "Beaten"
	| "Completed"
	| "OnHold"
	| "Dropped"
	| "Backlog";

interface EditCollectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	onRemove?: () => void;
	clerkId: string;
	collectionId: string;
	gameName: string;
	gamePlatforms?: string[];
	currentOwnershipType: OwnershipType;
	currentStatus?: CollectionStatus | null;
	currentPlatform?: string;
	currentDifficulty?: string;
	currentAcquiredAt?: number;
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
}[] = [
	{ value: "Unplayed", label: "Unplayed", emoji: "📦" },
	{ value: "Backlog", label: "Backlog", emoji: "📚" },
	{ value: "Playing", label: "Playing", emoji: "🎮" },
	{ value: "Beaten", label: "Beaten", emoji: "🏆" },
	{ value: "Completed", label: "Completed", emoji: "💯" },
	{ value: "OnHold", label: "On Hold", emoji: "⏸️" },
	{ value: "Dropped", label: "Dropped", emoji: "❌" },
];

const difficultySuggestions = [
	"None",
	"Story Mode",
	"Easy",
	"Normal",
	"Hard",
	"Hardest",
];

export function EditCollectionModal({
	isOpen,
	onClose,
	onSuccess,
	onRemove,
	clerkId,
	collectionId,
	gameName,
	gamePlatforms = [],
	currentOwnershipType,
	currentStatus,
	currentPlatform,
	currentDifficulty,
	currentAcquiredAt,
}: EditCollectionModalProps) {
	const updateCollection = useMutation(api.collections.update);
	const removeFromCollection = useMutation(api.collections.remove);
	const [ownershipType, setOwnershipType] =
		useState<OwnershipType>(currentOwnershipType);
	const [status, setStatus] = useState<CollectionStatus>(
		currentStatus || "Unplayed",
	);
	const [platform, setPlatform] = useState<string>(currentPlatform ?? "");
	const [difficulty, setDifficulty] = useState<string>(currentDifficulty ?? "");
	const [acquiredAt, setAcquiredAt] = useState<string>(
		currentAcquiredAt
			? new Date(currentAcquiredAt).toISOString().split("T")[0]
			: "",
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const platformId = useId();
	const difficultyId = useId();
	const difficultyListId = useId();
	const acquiredId = useId();

	if (!isOpen) return null;

	const handleSubmit = async () => {
		setIsSubmitting(true);
		setError(null);
		try {
			await updateCollection({
				clerkId,
				collectionId: collectionId as Id<"collections">,
				ownershipType,
				status,
				platform: platform || undefined,
				difficulty: difficulty || undefined,
				acquiredAt: acquiredAt ? new Date(acquiredAt).getTime() : undefined,
			});

			onSuccess?.();
			onClose();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to update collection";
			setError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemove = async () => {
		setIsRemoving(true);
		setError(null);
		try {
			await removeFromCollection({
				clerkId,
				collectionId: collectionId as Id<"collections">,
			});
			onRemove?.();
			onClose();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to remove from collection";
			setError(message);
			setIsRemoving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-md max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-800">
					<h2 className="text-lg font-bold text-white flex items-center gap-2">
						<Package size={20} className="text-purple-400" />
						Edit Collection Entry
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
						<p className="text-gray-400 text-sm">Editing</p>
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
						<div className="grid grid-cols-4 gap-2">
							{statusOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setStatus(option.value)}
									className={`p-2 rounded-lg border text-center transition-all ${
										status === option.value
											? "border-purple-500 bg-purple-500/10"
											: "border-gray-700 bg-gray-800 hover:border-gray-600"
									}`}
								>
									<span className="text-base">{option.emoji}</span>
									<span
										className={`block text-xs mt-1 ${status === option.value ? "text-white" : "text-gray-400"}`}
									>
										{option.label}
									</span>
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

					{/* Remove from Collection */}
					<div className="pt-2 border-t border-gray-700">
						{showRemoveConfirm ? (
							<div className="space-y-2">
								<p className="text-sm text-red-400">
									Are you sure you want to remove this game from your
									collection?
								</p>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleRemove}
										disabled={isRemoving}
										className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
									>
										{isRemoving ? (
											<Loader2 size={16} className="animate-spin mx-auto" />
										) : (
											"Yes, Remove"
										)}
									</button>
									<button
										type="button"
										onClick={() => setShowRemoveConfirm(false)}
										className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setShowRemoveConfirm(true)}
								className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
							>
								<Trash2 size={14} />
								Remove from Collection
							</button>
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
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
}
