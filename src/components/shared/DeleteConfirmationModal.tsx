import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DeleteConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	title: string;
	description: string;
	confirmLabel?: string;
}

export function DeleteConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	confirmLabel = "Delete",
}: DeleteConfirmationModalProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleConfirm = async () => {
		setIsDeleting(true);
		try {
			await onConfirm();
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect */}
			<div
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-red-500/20 rounded-lg">
						<Trash2 className="text-red-400" size={20} />
					</div>
					<h3 className="text-lg font-bold text-white">{title}</h3>
				</div>
				<p className="text-gray-400 mb-6">{description}</p>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onClose}
						disabled={isDeleting}
						className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={isDeleting}
						className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{isDeleting ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Deleting...
							</>
						) : (
							confirmLabel
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
