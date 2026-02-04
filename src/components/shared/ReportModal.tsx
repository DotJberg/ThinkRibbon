import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

interface ReportModalProps {
	isOpen: boolean;
	onClose: () => void;
	targetType: "post" | "article" | "review";
	targetId: string;
}

export function ReportModal({
	isOpen,
	onClose,
	targetType,
	targetId,
}: ReportModalProps) {
	const { user } = useUser();
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const createReport = useMutation(api.reports.create);

	useEffect(() => {
		if (!isOpen) {
			setMessage("");
			setError(null);
			setSuccess(false);
			return;
		}
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleSubmit = async () => {
		if (!user || !message.trim()) return;
		setIsSubmitting(true);
		setError(null);
		try {
			await createReport({
				clerkId: user.id,
				targetType,
				targetId,
				message: message.trim(),
			});
			setSuccess(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit report");
		} finally {
			setIsSubmitting(false);
		}
	};

	const contentTypeLabel =
		targetType === "post"
			? "post"
			: targetType === "article"
				? "article"
				: "review";

	if (success) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect */}
				<div
					className="absolute inset-0 bg-black/80 backdrop-blur-sm"
					onClick={onClose}
				/>
				<div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
					<div className="text-center">
						<div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
							<AlertTriangle className="text-green-400" size={24} />
						</div>
						<h3 className="text-lg font-bold text-white mb-2">
							Report Submitted
						</h3>
						<p className="text-gray-400 mb-6">
							Thank you for helping keep our community safe. We'll review this
							report and take appropriate action.
						</p>
						<button
							type="button"
							onClick={onClose}
							className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
						>
							Done
						</button>
					</div>
				</div>
			</div>
		);
	}

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
					<div className="p-2 bg-orange-500/20 rounded-lg">
						<AlertTriangle className="text-orange-400" size={20} />
					</div>
					<h3 className="text-lg font-bold text-white">
						Report {contentTypeLabel}
					</h3>
				</div>
				<p className="text-gray-400 mb-4">
					Please describe why you're reporting this content. Our team will
					review your report and take appropriate action.
				</p>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Describe the issue..."
					className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none h-32 mb-4"
				/>
				{error && <p className="text-red-400 text-sm mb-4">{error}</p>}
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={isSubmitting || !message.trim()}
						className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{isSubmitting ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Submitting...
							</>
						) : (
							"Submit Report"
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
