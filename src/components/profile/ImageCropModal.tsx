import { Check, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cropImage } from "../../lib/image-utils";

interface ImageCropModalProps {
	isOpen: boolean;
	imageSrc: string;
	aspect: number;
	cropShape?: "rect" | "round";
	outputWidth: number;
	outputHeight: number;
	onComplete: (croppedFile: File) => void;
	onCancel: () => void;
	title?: string;
}

export function ImageCropModal({
	isOpen,
	imageSrc,
	aspect,
	cropShape = "rect",
	outputWidth,
	outputHeight,
	onComplete,
	onCancel,
	title = "Crop Image",
}: ImageCropModalProps) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
		setCroppedAreaPixels(croppedPixels);
	}, []);

	const handleConfirm = useCallback(async () => {
		if (!croppedAreaPixels) return;

		setIsProcessing(true);
		try {
			const croppedFile = await cropImage(
				imageSrc,
				croppedAreaPixels,
				outputWidth,
				outputHeight,
			);
			onComplete(croppedFile);
		} catch (error) {
			console.error("Failed to crop image:", error);
		} finally {
			setIsProcessing(false);
		}
	}, [croppedAreaPixels, imageSrc, outputWidth, outputHeight, onComplete]);

	const handleReset = useCallback(() => {
		setCrop({ x: 0, y: 0 });
		setZoom(1);
	}, []);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-800">
					<h3 className="text-lg font-semibold text-white">{title}</h3>
					<button
						type="button"
						onClick={onCancel}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Cropper */}
				<div className="relative h-80 bg-black">
					<Cropper
						image={imageSrc}
						crop={crop}
						zoom={zoom}
						aspect={aspect}
						cropShape={cropShape}
						showGrid={true}
						onCropChange={setCrop}
						onZoomChange={setZoom}
						onCropComplete={onCropComplete}
					/>
				</div>

				{/* Controls */}
				<div className="p-4 border-t border-gray-800 space-y-4">
					{/* Zoom slider */}
					<div className="flex items-center gap-3">
						<ZoomOut size={18} className="text-gray-400" />
						<input
							type="range"
							min={1}
							max={3}
							step={0.1}
							value={zoom}
							onChange={(e) => setZoom(Number(e.target.value))}
							className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
						/>
						<ZoomIn size={18} className="text-gray-400" />
					</div>

					{/* Action buttons */}
					<div className="flex items-center justify-between">
						<button
							type="button"
							onClick={handleReset}
							className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
						>
							<RotateCcw size={16} />
							Reset
						</button>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onCancel}
								className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirm}
								disabled={isProcessing}
								className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								{isProcessing ? (
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : (
									<Check size={16} />
								)}
								Apply
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
