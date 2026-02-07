import { useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { AlertCircle, Loader2, Save, Upload, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { isNativePlatform, pickImageNative } from "../../lib/capacitor";
import { useUploadThing } from "../../lib/uploadthing";
import { ImageCropModal } from "./ImageCropModal";

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
	const updateProfile = useMutation(api.users.updateProfile);
	const [displayName, setDisplayName] = useState(
		user.displayName || user.username,
	);
	const [bio, setBio] = useState(user.bio || "");
	const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
	const [bannerUrl, setBannerUrl] = useState(user.bannerUrl);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Crop modal state
	const [cropModalOpen, setCropModalOpen] = useState(false);
	const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
	const [cropType, setCropType] = useState<"avatar" | "banner">("avatar");
	const [isUploading, setIsUploading] = useState(false);

	const avatarInputRef = useRef<HTMLInputElement>(null);
	const bannerInputRef = useRef<HTMLInputElement>(null);

	const { startUpload: uploadAvatar } = useUploadThing("profilePicture", {
		onClientUploadComplete: (res) => {
			if (res?.[0]) {
				const url = res[0].ufsUrl || res[0].url;
				setAvatarUrl(url);
			}
			setIsUploading(false);
		},
		onUploadError: (err) => {
			setError(err.message || "Avatar upload failed");
			setIsUploading(false);
		},
	});

	const { startUpload: uploadBanner } = useUploadThing("banner", {
		onClientUploadComplete: (res) => {
			if (res?.[0]) {
				const url = res[0].ufsUrl || res[0].url;
				setBannerUrl(url);
			}
			setIsUploading(false);
		},
		onUploadError: (err) => {
			setError(err.message || "Banner upload failed");
			setIsUploading(false);
		},
	});

	const openCropForFile = useCallback(
		(file: File, type: "avatar" | "banner") => {
			if (!file.type.startsWith("image/")) {
				setError("Please select an image file");
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				setCropImageSrc(reader.result as string);
				setCropType(type);
				setCropModalOpen(true);
			};
			reader.readAsDataURL(file);
		},
		[],
	);

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
			const file = e.target.files?.[0];
			if (!file) return;
			openCropForFile(file, type);
			// Reset input so same file can be selected again
			e.target.value = "";
		},
		[openCropForFile],
	);

	const handleNativeFilePick = useCallback(
		async (type: "avatar" | "banner") => {
			const picked = await pickImageNative();
			if (picked) openCropForFile(picked, type);
		},
		[openCropForFile],
	);

	const handleCropComplete = useCallback(
		async (croppedFile: File) => {
			setCropModalOpen(false);
			setCropImageSrc(null);
			setIsUploading(true);
			setError(null);

			try {
				if (cropType === "avatar") {
					await uploadAvatar([croppedFile]);
				} else {
					await uploadBanner([croppedFile]);
				}
			} catch {
				setError("Upload failed. Please try again.");
				setIsUploading(false);
			}
		},
		[cropType, uploadAvatar, uploadBanner],
	);

	const handleCropCancel = useCallback(() => {
		setCropModalOpen(false);
		setCropImageSrc(null);
	}, []);

	if (!isOpen) return null;

	const handleSave = async () => {
		setIsSaving(true);
		setError(null);
		try {
			await updateProfile({
				clerkId: user.clerkId,
				displayName,
				bio,
				avatarUrl: avatarUrl || undefined,
				bannerUrl: bannerUrl || undefined,
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
						<button
							type="button"
							onClick={
								isNativePlatform()
									? () => handleNativeFilePick("banner")
									: () => bannerInputRef.current?.click()
							}
							disabled={isUploading}
							className="relative w-full rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 hover:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							style={{ aspectRatio: "3/1" }}
						>
							{bannerUrl && (
								<img
									src={bannerUrl}
									alt="Banner"
									className="absolute inset-0 w-full h-full object-cover pointer-events-none"
								/>
							)}
							<div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-black/30">
								{isUploading && cropType === "banner" ? (
									<Loader2 size={24} className="mb-2 animate-spin" />
								) : (
									<Upload size={24} className="mb-2" />
								)}
								<p>{bannerUrl ? "Change Banner" : "Upload Banner (3:1)"}</p>
							</div>
						</button>
						<input
							ref={bannerInputRef}
							type="file"
							accept="image/*"
							onChange={(e) => handleFileSelect(e, "banner")}
							className="hidden"
						/>
						<p className="text-xs text-gray-500">
							Recommended size: 1500x500px (3:1). Max 8MB.
						</p>
					</div>

					{/* Avatar Upload */}
					<div className="flex items-center gap-6">
						<button
							type="button"
							onClick={
								isNativePlatform()
									? () => handleNativeFilePick("avatar")
									: () => avatarInputRef.current?.click()
							}
							disabled={isUploading}
							className="relative w-24 h-24 disabled:opacity-50 disabled:cursor-not-allowed"
						>
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
							<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
								{isUploading && cropType === "avatar" ? (
									<Loader2 size={20} className="text-white animate-spin" />
								) : (
									<Upload size={20} className="text-white" />
								)}
							</div>
						</button>
						<input
							ref={avatarInputRef}
							type="file"
							accept="image/*"
							onChange={(e) => handleFileSelect(e, "avatar")}
							className="hidden"
						/>
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

			{/* Crop Modal */}
			{cropImageSrc && (
				<ImageCropModal
					isOpen={cropModalOpen}
					imageSrc={cropImageSrc}
					aspect={cropType === "avatar" ? 1 : 3}
					cropShape={cropType === "avatar" ? "round" : "rect"}
					outputWidth={cropType === "avatar" ? 400 : 1500}
					outputHeight={cropType === "avatar" ? 400 : 500}
					onComplete={handleCropComplete}
					onCancel={handleCropCancel}
					title={
						cropType === "avatar" ? "Crop Profile Photo" : "Crop Banner Image"
					}
				/>
			)}
		</div>
	);
}
