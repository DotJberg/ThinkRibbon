import { useBlocker } from "@tanstack/react-router";
import { AlertTriangle, FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface NavigationWarningProps {
	hasUnsavedChanges: boolean;
	draftId?: string;
	onDeleteDraft?: () => Promise<void>;
	onKeepDraft?: () => void;
}

export function NavigationWarning({
	hasUnsavedChanges,
	draftId,
	onDeleteDraft,
	onKeepDraft,
}: NavigationWarningProps) {
	const [showModal, setShowModal] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [pendingNavigation, setPendingNavigation] = useState<
		(() => void) | null
	>(null);

	// Block navigation when there are unsaved changes
	const blocker = useBlocker({
		condition: hasUnsavedChanges,
	});

	// Show modal when navigation is blocked
	useEffect(() => {
		if (blocker.status === "blocked") {
			setShowModal(true);
			setPendingNavigation(() => blocker.proceed);
		}
	}, [blocker.status, blocker.proceed]);

	// Handle browser close/refresh
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault();
				e.returnValue = "";
				return "";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	const handleKeepDraft = () => {
		onKeepDraft?.();
		setShowModal(false);
		pendingNavigation?.();
	};

	const handleDeleteDraft = async () => {
		if (!draftId || !onDeleteDraft) {
			// No draft to delete, just proceed
			setShowModal(false);
			pendingNavigation?.();
			return;
		}

		setIsDeleting(true);
		try {
			await onDeleteDraft();
			setShowModal(false);
			pendingNavigation?.();
		} catch (error) {
			console.error("Failed to delete draft:", error);
			// Still proceed even if delete fails
			setShowModal(false);
			pendingNavigation?.();
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCancel = () => {
		setShowModal(false);
		setPendingNavigation(null);
		blocker.reset?.();
	};

	if (!showModal) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
			<div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
				{/* Header */}
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-amber-500/20 rounded-lg">
						<AlertTriangle className="text-amber-400" size={24} />
					</div>
					<h2 className="text-xl font-semibold text-white">
						You have unsaved changes
					</h2>
				</div>

				{/* Message */}
				<p className="text-gray-400 mb-6">
					{draftId
						? "Your draft has been auto-saved. Would you like to keep it for later or delete it?"
						: "You have unsaved changes. Would you like to save as a draft or discard your work?"}
				</p>

				{/* Buttons */}
				<div className="flex flex-col gap-3">
					<button
						type="button"
						onClick={handleKeepDraft}
						className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
					>
						<FileText size={18} />
						Keep Draft
					</button>

					<button
						type="button"
						onClick={handleDeleteDraft}
						disabled={isDeleting}
						className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
					>
						{isDeleting ? (
							<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
						) : (
							<Trash2 size={18} />
						)}
						Delete Draft
					</button>

					<button
						type="button"
						onClick={handleCancel}
						className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
					>
						Continue Editing
					</button>
				</div>
			</div>
		</div>
	);
}
