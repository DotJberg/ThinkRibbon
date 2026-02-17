import { formatDistanceToNow } from "date-fns";
import { History, X } from "lucide-react";
import { useEffect } from "react";
import { StarRating } from "./StarRating";

interface VersionEntry {
	_id?: string;
	content: string;
	editedAt: number;
	title?: string;
	rating?: number;
	excerpt?: string;
	containsSpoilers?: boolean;
}

interface VersionHistoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	contentType: "post" | "article" | "review";
	current: VersionEntry | null;
	versions: VersionEntry[];
}

export function VersionHistoryModal({
	isOpen,
	onClose,
	contentType,
	current,
	versions,
}: VersionHistoryModalProps) {
	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const allEntries = [
		...(current ? [{ ...current, isCurrent: true }] : []),
		...versions.map((v) => ({ ...v, isCurrent: false })),
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect */}
			<div
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full mx-4 shadow-2xl max-h-[85vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-700/50">
					<div className="flex items-center gap-3">
						<History className="text-slate-400" size={20} />
						<h3 className="text-lg font-bold text-white">Version History</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 text-gray-400 hover:text-white transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="overflow-y-auto p-6 space-y-0">
					{allEntries.map((entry, index) => (
						<div key={entry._id ?? `current-${index}`}>
							{/* Timeline connector */}
							{index > 0 && (
								<div className="ml-4 h-6 border-l-2 border-gray-700" />
							)}

							<div className="flex gap-4">
								{/* Timeline dot */}
								<div className="flex-shrink-0 mt-2">
									<div
										className={`w-3 h-3 rounded-full border-2 ${
											entry.isCurrent
												? "bg-slate-600 border-slate-400"
												: "bg-gray-700 border-gray-600"
										}`}
									/>
								</div>

								{/* Entry card */}
								<div
									className={`flex-1 p-4 rounded-lg border ${
										entry.isCurrent
											? "bg-slate-500/10 border-slate-500/30"
											: "bg-gray-800/50 border-gray-700/50"
									}`}
								>
									<div className="flex items-center gap-2 mb-2">
										{entry.isCurrent && (
											<span className="px-2 py-0.5 text-xs font-medium bg-slate-500/20 text-slate-300 rounded-full">
												Current
											</span>
										)}
										<span className="text-sm text-gray-400">
											{formatDistanceToNow(new Date(entry.editedAt))} ago
										</span>
									</div>

									{/* Title (articles/reviews) */}
									{(contentType === "article" || contentType === "review") &&
										entry.title && (
											<h4 className="text-white font-medium mb-1">
												{entry.title}
											</h4>
										)}

									{/* Rating (reviews) */}
									{contentType === "review" && entry.rating !== undefined && (
										<div className="mb-2">
											<StarRating rating={entry.rating} size="sm" />
										</div>
									)}

									{/* Content preview */}
									<div className="text-gray-300 text-sm">
										{contentType === "post" ? (
											<p className="whitespace-pre-wrap">{entry.content}</p>
										) : (
											<p className="line-clamp-4 whitespace-pre-wrap">
												{getPlainTextPreview(entry.content)}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					))}

					{allEntries.length === 0 && (
						<div className="text-center text-gray-500 py-8">
							No version history available.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function getPlainTextPreview(content: string): string {
	// If content is JSON (TipTap), try to extract text
	if (content.startsWith("{") || content.startsWith("[")) {
		try {
			const doc = JSON.parse(content);
			return extractTextFromTipTap(doc);
		} catch {
			return content;
		}
	}
	return content;
}

function extractTextFromTipTap(node: Record<string, unknown>): string {
	if (node.type === "text" && typeof node.text === "string") {
		return node.text;
	}
	if (Array.isArray(node.content)) {
		return node.content
			.map((child: Record<string, unknown>) => extractTextFromTipTap(child))
			.join(node.type === "paragraph" ? "\n" : "");
	}
	return "";
}
