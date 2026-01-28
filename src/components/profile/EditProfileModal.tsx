import { useState, useId } from "react";
import { X, Upload, Save, Loader2, AlertCircle } from "lucide-react";
import { UploadButton } from "../../lib/uploadthing";
import { updateUserProfile } from "../../lib/server/users";
import { useRouter } from "@tanstack/react-router";

interface EditProfileModalProps {
	isOpen: boolean;
	onClose: () => void;
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

export function EditProfileModal({ isOpen, onClose, user }: EditProfileModalProps) {
	const router = useRouter();
	const uniqueId = useId();
	const [displayName, setDisplayName] = useState(user.displayName || user.username);
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
					bannerUrl: bannerUrl || undefined,
				},
			});
			router.invalidate();
			onClose();
		} catch (err) {
			console.error(err);
			setError("Failed to save profile");
		} finally {
			setIsSaving(false);
		}
	};

	const validateImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.src = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(img.src);
				if (img.width > maxWidth || img.height > maxHeight) {
					reject(new Error(`Image must be smaller than ${maxWidth}x${maxHeight}px`));
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
						<span className="text-sm font-medium text-gray-400">Banner Image</span>
						<div className="relative h-32 md:h-48 rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 hover:border-purple-500 transition-colors group">
							{bannerUrl ? (
								<>
									<img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
									<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
										<p className="text-white font-medium">Change Banner</p>
									</div>
								</>
							) : (
								<div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
									<Upload size={24} className="mb-2" />
									<p>Upload Banner (Max 1500x500)</p>
								</div>
							)}
							
							<div className="absolute inset-0 opacity-0 cursor-pointer">
								<UploadButton
									endpoint="banner"
									onClientUploadComplete={(res) => {
										setBannerUrl(res[0].url);
									}}
									onUploadError={(error: Error) => {
										setError(error.message);
									}}
									onBeforeUploadBegin={async (files) => {
										try {
											return await Promise.all(
												files.map((f) => validateImage(f, 1500, 500))
											);
										} catch (e) {
											setError((e as Error).message);
											throw e;
										}
									}}
									appearance={{
										button: "w-full h-full cursor-pointer",
										allowedContent: "hidden" 
									}}
								/>
							</div>
						</div>
						<p className="text-xs text-gray-500">Recommended size: 1500x500px. Max 8MB.</p>
					</div>

					{/* Avatar Upload */}
					<div className="flex items-center gap-6">
						<div className="relative group">
							<div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-purple-500 transition-colors">
								{avatarUrl ? (
									<img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
								) : (
									<div className="w-full h-full flex items-center justify-center text-2xl text-white font-bold bg-gradient-to-br from-purple-500 to-pink-500">
										{displayName?.[0]?.toUpperCase()}
									</div>
								)}
								<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
									<Upload size={20} className="text-white" />
								</div>
							</div>
							
							<div className="absolute inset-0 opacity-0 cursor-pointer rounded-full overflow-hidden">
								<UploadButton
									endpoint="profilePicture"
									onClientUploadComplete={(res) => {
										setAvatarUrl(res[0].url);
									}}
									onUploadError={(error: Error) => {
										setError(error.message);
									}}
									onBeforeUploadBegin={async (files) => {
										try {
											return await Promise.all(
												files.map((f) => validateImage(f, 400, 400))
											);
										} catch (e) {
											setError((e as Error).message);
											throw e;
										}
									}}
									appearance={{
										button: "w-full h-full cursor-pointer",
										allowedContent: "hidden"
									}}
								/>
							</div>
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
						<label htmlFor={`${uniqueId}-displayName`} className="text-sm font-medium text-gray-400">Display Name</label>
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
						<label htmlFor={`${uniqueId}-bio`} className="text-sm font-medium text-gray-400">Bio</label>
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
						{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
						Save Changes
					</button>
				</div>

			</div>
		</div>
	);
}
