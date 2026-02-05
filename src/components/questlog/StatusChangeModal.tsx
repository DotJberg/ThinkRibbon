import { useMutation } from "convex/react";
import {
	Calendar,
	Loader2,
	Monitor,
	Share2,
	Star,
	Trash2,
	X,
} from "lucide-react";
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

interface StatusChangeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	onRemove?: () => void;
	clerkId: string;
	gameId: string;
	gameName: string;
	currentStatus: QuestLogStatus;
	questLogId: string;
	currentStartedAt?: number | null;
	currentCompletedAt?: number | null;
	currentPlatform?: string | null;
	currentDifficulty?: string | null;
	gamePlatforms?: string[];
}

const difficultySuggestions = [
	"Story Mode",
	"Easy",
	"Normal",
	"Hard",
	"Hardest",
	"No Difficulty",
];

type ReviewOption = "none" | "quick" | "full";

const statusOptions: { value: QuestLogStatus; label: string; emoji: string }[] =
	[
		{ value: "Beaten", label: "Beaten", emoji: "🏆" },
		{ value: "Completed", label: "100% Complete", emoji: "💯" },
		{ value: "OnHold", label: "On Hold", emoji: "⏸️" },
		{ value: "Dropped", label: "Dropped", emoji: "❌" },
		{ value: "Backlog", label: "Backlog", emoji: "📚" },
		{ value: "Playing", label: "Playing", emoji: "🎮" },
	];

function formatDateForInput(date: number | null | undefined): string {
	if (!date) return "";
	const d = new Date(date);
	return d.toISOString().split("T")[0];
}

export function StatusChangeModal({
	isOpen,
	onClose,
	onSuccess,
	onRemove,
	clerkId,
	gameId,
	gameName,
	currentStatus,
	questLogId,
	currentStartedAt,
	currentCompletedAt,
	currentPlatform,
	currentDifficulty,
	gamePlatforms = [],
}: StatusChangeModalProps) {
	const updateQuestLogMut = useMutation(api.questlog.update);
	const updateQuestLogStatusMut = useMutation(api.questlog.updateStatus);
	const removeFromQuestLog = useMutation(api.questlog.remove);
	const [newStatus, setNewStatus] = useState<QuestLogStatus>(
		currentStatus === "Playing" ? "Beaten" : currentStatus,
	);
	const [platform, setPlatform] = useState<string>(currentPlatform ?? "");
	const [difficulty, setDifficulty] = useState<string>(currentDifficulty ?? "");
	const [reviewOption, setReviewOption] = useState<ReviewOption>("none");
	const [quickRating, setQuickRating] = useState<number>(0);
	const [shareAsPost, setShareAsPost] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
	const [hoverRating, setHoverRating] = useState<number>(0);
	const [startedAt, setStartedAt] = useState<string>(
		formatDateForInput(currentStartedAt),
	);
	const [completedAt, setCompletedAt] = useState<string>(
		formatDateForInput(currentCompletedAt),
	);
	const startedId = useId();
	const completedId = useId();
	const platformId = useId();
	const difficultyId = useId();
	const difficultyListId = useId();

	if (!isOpen) return null;

	const statusText = {
		Beaten: "beat",
		Completed: "100% completed",
		Dropped: "dropped",
		OnHold: "put on hold",
		Playing: "started playing",
		Backlog: "added to backlog",
	}[newStatus];

	const previewPost = `I just ${statusText} ${gameName}! ${"⭐".repeat(quickRating)}`;

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			if (reviewOption === "full") {
				// Navigate to full review editor
				window.location.href = `/reviews/new?gameId=${gameId}`;
				return;
			}

			// If using quick rating, use the status update function
			if (reviewOption === "quick" && quickRating > 0) {
				await updateQuestLogStatusMut({
					clerkId,
					gameId: gameId as Id<"games">,
					newStatus,
					quickRating,
					shareAsPost,
				});
			} else {
				// Use updateQuestLog to update status, dates, platform, and difficulty
				await updateQuestLogMut({
					clerkId,
					questLogId: questLogId as Id<"questLogs">,
					status: newStatus,
					platform: platform || undefined,
					difficulty: difficulty || undefined,
					startedAt: startedAt ? new Date(startedAt).getTime() : undefined,
					completedAt: completedAt
						? new Date(completedAt).getTime()
						: undefined,
				});
			}

			onSuccess?.();
			onClose();
		} catch (error) {
			console.error("Failed to update status:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemove = async () => {
		setIsRemoving(true);
		try {
			await removeFromQuestLog({
				clerkId,
				questLogId: questLogId as Id<"questLogs">,
			});
			onRemove?.();
			onClose();
		} catch (error) {
			console.error("Failed to remove from quest log:", error);
			setIsRemoving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-md max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-800">
					<h2 className="text-lg font-bold text-white">Update Playthrough</h2>
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
						<p className="text-gray-400 text-sm">Updating playthrough for</p>
						<p className="text-white font-semibold text-lg">{gameName}</p>
					</div>

					<div className="space-y-2">
						<span className="text-sm font-medium text-gray-400">
							New Status
						</span>
						<div className="grid grid-cols-2 gap-2">
							{statusOptions
								.filter((s) => s.value !== currentStatus)
								.map((status) => (
									<button
										key={status.value}
										type="button"
										onClick={() => setNewStatus(status.value)}
										className={`p-3 rounded-lg border text-left transition-all ${
											newStatus === status.value
												? "border-purple-500 bg-purple-500/10 text-white"
												: "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
										}`}
									>
										<span className="mr-2">{status.emoji}</span>
										{status.label}
									</button>
								))}
						</div>
					</div>

					{/* Dates */}
					<div className="space-y-3">
						<span className="text-sm font-medium text-gray-400 flex items-center gap-2">
							<Calendar size={14} />
							Dates
						</span>

						{/* Started Date */}
						<div className="space-y-1">
							<label htmlFor={startedId} className="text-xs text-gray-500">
								Started Date
							</label>
							<input
								id={startedId}
								type="date"
								value={startedAt}
								onChange={(e) => setStartedAt(e.target.value)}
								className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
							/>
						</div>

						{/* Completed/Dropped/Beaten Date */}
						{(newStatus === "Beaten" ||
							newStatus === "Completed" ||
							newStatus === "Dropped") && (
							<div className="space-y-1">
								<label htmlFor={completedId} className="text-xs text-gray-500">
									{newStatus === "Beaten"
										? "Finished"
										: newStatus === "Completed"
											? "Completed"
											: "Dropped"}{" "}
									Date
								</label>
								<input
									id={completedId}
									type="date"
									value={completedAt}
									onChange={(e) => setCompletedAt(e.target.value)}
									className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
								/>
							</div>
						)}
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

					{/* Review Options - only show when moving from Playing status */}
					{currentStatus === "Playing" && (
						<>
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-400">
									Add a Review?
								</span>
								<div className="space-y-2">
									<button
										type="button"
										onClick={() => setReviewOption("none")}
										className={`w-full p-3 rounded-lg border text-left transition-all ${
											reviewOption === "none"
												? "border-purple-500 bg-purple-500/10 text-white"
												: "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
										}`}
									>
										No Review
										<span className="block text-xs text-gray-500 mt-1">
											Just update the status
										</span>
									</button>

									<button
										type="button"
										onClick={() => setReviewOption("quick")}
										className={`w-full p-3 rounded-lg border text-left transition-all ${
											reviewOption === "quick"
												? "border-purple-500 bg-purple-500/10 text-white"
												: "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
										}`}
									>
										Quick Review
										<span className="block text-xs text-gray-500 mt-1">
											Just a star rating
										</span>
									</button>

									<button
										type="button"
										onClick={() => setReviewOption("full")}
										className={`w-full p-3 rounded-lg border text-left transition-all ${
											reviewOption === "full"
												? "border-purple-500 bg-purple-500/10 text-white"
												: "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
										}`}
									>
										Full Review
										<span className="block text-xs text-gray-500 mt-1">
											Write a detailed review
										</span>
									</button>
								</div>
							</div>

							{/* Quick Rating UI */}
							{reviewOption === "quick" && (
								<div className="space-y-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
									<span className="text-sm font-medium text-gray-400">
										Your Rating
									</span>
									{/* Star Rating */}
									<div className="flex justify-center gap-2">
										{[1, 2, 3, 4, 5].map((rating) => (
											<button
												key={rating}
												type="button"
												onClick={() => setQuickRating(rating)}
												onMouseEnter={() => setHoverRating(rating)}
												onMouseLeave={() => setHoverRating(0)}
												className="p-1 transition-transform hover:scale-110"
											>
												<Star
													size={28}
													className={`transition-colors ${
														rating <= (hoverRating || quickRating)
															? "text-yellow-400 fill-yellow-400"
															: "text-gray-600"
													}`}
												/>
											</button>
										))}
									</div>
									<p className="text-center text-sm text-gray-400">
										{quickRating > 0 ? `${quickRating}/5` : "Select a rating"}
									</p>

									{/* Share as Post Toggle */}
									{quickRating > 0 && (
										<div className="space-y-2 pt-2 border-t border-gray-700">
											<label className="flex items-center gap-3 cursor-pointer">
												<input
													type="checkbox"
													checked={shareAsPost}
													onChange={(e) => setShareAsPost(e.target.checked)}
													className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
												/>
												<span className="flex items-center gap-2 text-sm text-gray-300">
													<Share2 size={16} />
													Share as post
												</span>
											</label>

											{/* Post Preview */}
											{shareAsPost && (
												<div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
													<p className="text-sm text-gray-400 mb-1">Preview:</p>
													<p className="text-white">{previewPost}</p>
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</>
					)}

					{/* Remove from Quest Log */}
					<div className="pt-2 border-t border-gray-700">
						{showRemoveConfirm ? (
							<div className="space-y-2">
								<p className="text-sm text-red-400">
									Are you sure you want to remove this game from your Quest Log?
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
								Remove from Quest Log
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
						disabled={
							isSubmitting || (reviewOption === "quick" && quickRating === 0)
						}
						className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					>
						{isSubmitting && <Loader2 size={16} className="animate-spin" />}
						{reviewOption === "full" ? "Continue to Review" : "Update Status"}
					</button>
				</div>
			</div>
		</div>
	);
}
