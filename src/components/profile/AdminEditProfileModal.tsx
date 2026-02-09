import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface AdminEditProfileModalProps {
	isOpen: boolean;
	onClose: () => void;
	user: {
		id: Id<"users">;
		username: string;
		displayName?: string;
		bio?: string;
	};
}

export function AdminEditProfileModal({
	isOpen,
	onClose,
	user: targetUser,
}: AdminEditProfileModalProps) {
	const { user: currentUser } = useUser();
	const uniqueId = useId();
	const adminUpdateProfile = useMutation(api.users.adminUpdateProfile);
	const [displayName, setDisplayName] = useState(
		targetUser.displayName || targetUser.username,
	);
	const [bio, setBio] = useState(targetUser.bio || "");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setDisplayName(targetUser.displayName || targetUser.username);
			setBio(targetUser.bio || "");
			setError(null);
		}
	}, [isOpen, targetUser]);

	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleSave = async () => {
		if (!currentUser) return;
		setIsSaving(true);
		setError(null);
		try {
			await adminUpdateProfile({
				clerkId: currentUser.id,
				userId: targetUser.id,
				displayName,
				bio,
			});
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update profile");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via useEffect */}
			<div
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-800">
					<div>
						<h2 className="text-xl font-bold text-white">
							Admin: Edit Profile
						</h2>
						<p className="text-sm text-gray-400 mt-1">
							Editing @{targetUser.username}'s profile
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="p-6 space-y-6">
					{error && (
						<div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
							<AlertCircle size={18} />
							{error}
						</div>
					)}

					{/* Display Name */}
					<div className="space-y-2">
						<label
							htmlFor={`${uniqueId}-displayName`}
							className="text-sm font-medium text-gray-400"
						>
							Display Name
						</label>
						<input
							id={`${uniqueId}-displayName`}
							type="text"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-slate-500 transition-colors"
							placeholder="Display name"
						/>
					</div>

					{/* Bio */}
					<div className="space-y-2">
						<label
							htmlFor={`${uniqueId}-bio`}
							className="text-sm font-medium text-gray-400"
						>
							Bio
						</label>
						<textarea
							id={`${uniqueId}-bio`}
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							rows={4}
							className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-slate-500 transition-colors resize-none"
							placeholder="Bio..."
							maxLength={160}
						/>
						<p className="text-xs text-end text-gray-500">{bio.length}/160</p>
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 border-t border-gray-800 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving}
						className="px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					>
						{isSaving ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<Save size={16} />
						)}
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
}
