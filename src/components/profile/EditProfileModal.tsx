import { useRouter } from "@tanstack/react-router";
import { AlertCircle, Loader2, Save, Upload, X } from "lucide-react";
import { useId, useState } from "react";
import { updateUserProfile } from "../../lib/server/users";
import { UploadButton } from "../../lib/uploadthing";

interface EditProfileModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave?: (updatedUser: {
		displayName: string | null;
		bio: string | null;
		avatarUrl: string | null;
		bannerUrl: string | null;
	}) => void;
	user: {
		id: string;
		clerkId: string;
		username: string;
		displayName: string | null;
		bio: string | null;
		avatarUrl: string | null;
		bannerUrl: string | null;
	};
}

export function EditProfileModal({
	isOpen,
	onClose,
	onSave,
	user,
}: EditProfileModalProps) {
	const router = useRouter();
	const uniqueId = useId();
	const [displayName, setDisplayName] = useState(
		user.displayName || user.username,
	);
	const [bio, setBio] = useState(user.bio || "");
	const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
	const [bannerUrl, setBannerUrl] = useState(user.bannerUrl);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!isOpen) return null;

	const handleSave = async () => {
		setIsSaving(true);
		setError(null);
		try {
			await updateUserProfile({
				data: {
					clerkId: user.clerkId,
					displayName,
					bio,
					avatarUrl: avatarUrl || undefined,
					bannerUrl: bannerUrl || undefined,
				},
			});
			onSave?.({
				displayName,
				bio,
				avatarUrl,
				bannerUrl,
			});
			router.invalidate();
			onClose();
		} catch (err) {
			console.error("Failed to save profile:", err);
			setError("Failed to save profile");
		} finally {
			setIsSaving(false);
		}
	};

	const validateImage = (
		file: File,
		maxWidth: number,
		maxHeight: number,
	): Promise<File> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.src = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(img.src);
				if (img.width > maxWidth || img.height > maxHeight) {
					reject(
						new Error(`Image must be smaller than ${maxWidth}x${maxHeight}px`),
					);
				} else {
					resolve(file);
				}
			};
			img.onerror = () => reject(new Error("Invalid image file"));
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-800">
					<h2 className="text-xl font-bold text-white">Edit Profile</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
					{error && (
						<div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
							<AlertCircle size={18} />
							{error}
						</div>
					)}

					{/* Banner Upload */}
					<div className="space-y-2">
						<span className="text-sm font-medium text-gray-400">
							Banner Image
						</span>
						<div
							className="relative rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 hover:border-purple-500 transition-colors"
							style={{ aspectRatio: "3/1" }}
						>
							{bannerUrl && (
								<img
									src={bannerUrl}
									alt="Banner"
									className="absolute inset-0 w-full h-full object-cover pointer-events-none"
								/>
							)}
							<div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none bg-black/30">
								<Upload size={24} className="mb-2" />
								<p>{bannerUrl ? "Change Banner" : "Upload Banner (3:1)"}</p>
							</div>
							<UploadButton
								endpoint="banner"
								onClientUploadComplete={(res) => {
									const url = res[0].ufsUrl || res[0].url;
									setBannerUrl(url);
								}}
								onUploadError={(error: Error) => {
									setError(error.message);
								}}
								onBeforeUploadBegin={async (files) => {
									try {
										return await Promise.all(
											files.map((f) => validateImage(f, 1500, 500)),
										);
									} catch (e) {
										setError((e as Error).message);
										throw e;
									}
								}}
								appearance={{
									button:
										"!absolute !inset-0 !w-full !h-full !bg-transparent !border-0 !ring-0 !shadow-none cursor-pointer",
									allowedContent: "hidden",
									container: "absolute inset-0 w-full h-full",
								}}
							/>
						</div>
						<p className="text-xs text-gray-500">
							Recommended size: 1500x500px (3:1). Max 8MB.
						</p>
					</div>

					{/* Avatar Upload */}
					<div className="flex items-center gap-6">
						<div className="relative w-24 h-24">
							<div className="w-full h-full rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 hover:border-purple-500 transition-colors">
								{avatarUrl ? (
									<img
										src={avatarUrl}
										alt="Avatar"
										className="w-full h-full object-cover pointer-events-none"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-2xl text-white font-bold bg-gradient-to-br from-purple-500 to-pink-500 pointer-events-none">
										{displayName?.[0]?.toUpperCase()}
									</div>
								)}
							</div>
							<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center pointer-events-none">
								<Upload size={20} className="text-white" />
							</div>
							<UploadButton
								endpoint="profilePicture"
								onClientUploadComplete={(res) => {
									const url = res[0].ufsUrl || res[0].url;
									setAvatarUrl(url);
								}}
								onUploadError={(error: Error) => {
									setError(error.message);
								}}
								onBeforeUploadBegin={async (files) => {
									try {
										return await Promise.all(
											files.map((f) => validateImage(f, 400, 400)),
										);
									} catch (e) {
										setError((e as Error).message);
										throw e;
									}
								}}
								appearance={{
									button:
										"!absolute !inset-0 !w-full !h-full !bg-transparent !border-0 !ring-0 !shadow-none !rounded-full cursor-pointer",
									allowedContent: "hidden",
									container: "absolute inset-0 w-full h-full",
								}}
							/>
						</div>
						<div className="flex-1 space-y-2">
							<h3 className="font-medium text-white">Profile Photo</h3>
							<p className="text-sm text-gray-500">
								Recommended size: 400x400px. Max 4MB.
							</p>
						</div>
					</div>

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
							className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
							placeholder="Your display name"
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
							className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
							placeholder="Tell us about yourself..."
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
						className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
