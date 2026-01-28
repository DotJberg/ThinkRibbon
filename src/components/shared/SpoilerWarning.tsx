"use client";

import { ArrowLeft, ShieldAlert, Skull } from "lucide-react";

interface SpoilerWarningProps {
	title: string;
	contentType?: "article" | "review";
	onGoBack: () => void;
	onContinue: () => void;
}

export function SpoilerWarning({
	title,
	contentType = "article",
	onGoBack,
	onContinue,
}: SpoilerWarningProps) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-red-900/20 flex items-center justify-center p-4">
			<div className="max-w-lg w-full">
				{/* Warning Card */}
				<div className="bg-gray-900/90 border-2 border-amber-500/50 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/10">
					{/* Header with animated border */}
					<div className="relative bg-gradient-to-r from-amber-600/20 via-red-600/20 to-amber-600/20 p-6 border-b border-amber-500/30">
						<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />

						{/* Icon */}
						<div className="relative flex justify-center mb-4">
							<div className="relative">
								<div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse" />
								<div className="relative p-4 bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 rounded-full">
									<ShieldAlert className="text-amber-400" size={48} />
								</div>
							</div>
						</div>

						{/* Title */}
						<h1 className="relative text-center text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400 tracking-wider">
							DANGER ZONE AHEAD
						</h1>
					</div>

					{/* Content */}
					<div className="p-6 space-y-6">
						{/* Article/Review title */}
						<div className="text-center">
							<p className="text-gray-400 text-sm mb-1">
								You are about to read:
							</p>
							<p className="text-white font-semibold text-lg">{title}</p>
						</div>

						{/* Warning message */}
						<div className="space-y-4 text-center">
							<p className="text-gray-300 leading-relaxed">
								The author has marked this {contentType} as containing{" "}
								<span className="text-amber-400 font-semibold">spoilers</span>.
							</p>

							<div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-left">
								<Skull
									className="text-red-400 flex-shrink-0 mt-0.5"
									size={20}
								/>
								<p className="text-sm text-red-200/90 italic">
									"You are about to enter an area where plot secrets may be
									revealed. Proceed with caution, adventurer. There is no
									unseeing what lies ahead..."
								</p>
							</div>

							<p className="text-gray-500 text-sm">
								This may include information about key plot points, character
								revelations, or ending details.
							</p>
						</div>

						{/* Buttons */}
						<div className="flex flex-col sm:flex-row gap-3 pt-2">
							<button
								type="button"
								onClick={onGoBack}
								className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 rounded-xl transition-all font-medium"
							>
								<ArrowLeft size={18} />
								Return to Safety
							</button>
							<button
								type="button"
								onClick={onContinue}
								className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
							>
								I Accept My Fate
							</button>
						</div>
					</div>

					{/* Footer decoration */}
					<div className="h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
				</div>

				{/* Subtle hint */}
				<p className="text-center text-gray-600 text-xs mt-4">
					Press Escape or click "Return to Safety" to go back
				</p>
			</div>
		</div>
	);
}

// Badge component for cards
export function SpoilerBadge({ className = "" }: { className?: string }) {
	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-medium text-amber-400 ${className}`}
		>
			<ShieldAlert size={12} />
			Spoilers
		</span>
	);
}

// Toggle component for forms
interface SpoilerToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export function SpoilerToggle({ checked, onChange }: SpoilerToggleProps) {
	return (
		<div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
			<div className="flex items-center gap-3">
				<div
					className={`p-2 rounded-lg ${
						checked ? "bg-amber-500/20" : "bg-gray-700"
					}`}
				>
					<ShieldAlert
						className={checked ? "text-amber-400" : "text-gray-400"}
						size={20}
					/>
				</div>
				<div>
					<p className="text-white font-medium">Contains Spoilers</p>
					<p className="text-sm text-gray-400">
						{checked
							? "Readers will be warned before viewing"
							: "Mark if your content reveals plot details"}
					</p>
				</div>
			</div>

			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
					checked ? "bg-amber-500" : "bg-gray-600"
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
						checked ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</button>
		</div>
	);
}
