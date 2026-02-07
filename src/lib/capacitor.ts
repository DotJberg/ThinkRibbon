import { Capacitor } from "@capacitor/core";

/**
 * Returns true when running inside a native iOS/Android shell.
 */
export function isNativePlatform(): boolean {
	return Capacitor.isNativePlatform();
}

/**
 * Opens the native camera/gallery picker and returns a File object
 * compatible with the existing upload pipeline.
 */
export async function pickImageNative(): Promise<File | null> {
	const { Camera, CameraResultType, CameraSource } = await import(
		"@capacitor/camera"
	);

	try {
		const photo = await Camera.getPhoto({
			quality: 90,
			allowEditing: false,
			resultType: CameraResultType.Uri,
			source: CameraSource.Prompt,
		});

		if (!photo.webPath) return null;

		const response = await fetch(photo.webPath);
		const blob = await response.blob();
		const extension = photo.format || "jpeg";
		return new File([blob], `photo.${extension}`, {
			type: `image/${extension}`,
		});
	} catch {
		// User cancelled the picker
		return null;
	}
}

/**
 * Triggers a light haptic tap — use for like/follow actions.
 */
export async function triggerHaptic(): Promise<void> {
	if (!isNativePlatform()) return;

	try {
		const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
		await Haptics.impact({ style: ImpactStyle.Light });
	} catch {
		// Haptics not available
	}
}
