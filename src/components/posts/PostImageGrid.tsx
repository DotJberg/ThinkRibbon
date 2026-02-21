import { useState } from "react";
import { SafeImage } from "../shared/SafeImage";

interface PostImage {
	url: string;
	caption?: string;
}

interface PostImageGridProps {
	images: PostImage[];
}

export function PostImageGrid({ images }: PostImageGridProps) {
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	if (images.length === 0) return null;

	const count = images.length;

	return (
		<>
			<div
				className={`grid gap-1 rounded-xl overflow-hidden mt-3 ${
					count === 1
						? "grid-cols-1"
						: count === 2
							? "grid-cols-2"
							: count === 3
								? "grid-cols-2"
								: "grid-cols-2"
				}`}
			>
				{images.slice(0, 4).map((img, i) => {
					return (
						<button
							key={img.url}
							type="button"
							onClick={() => setLightboxIndex(i)}
							className={`relative overflow-hidden bg-gray-700 ${count === 1 ? "max-h-96" : count === 2 ? "h-48" : "h-40"}`}
						>
							<SafeImage
								src={img.url}
								alt={img.caption || ""}
								className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
								fallback={
									<div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
										Image
									</div>
								}
							/>
						</button>
					);
				})}
			</div>

			{/* Lightbox */}
			{lightboxIndex !== null && (
				<div
					role="dialog"
					className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
					onClick={() => setLightboxIndex(null)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setLightboxIndex(null);
						if (e.key === "ArrowRight" && lightboxIndex < images.length - 1)
							setLightboxIndex(lightboxIndex + 1);
						if (e.key === "ArrowLeft" && lightboxIndex > 0)
							setLightboxIndex(lightboxIndex - 1);
					}}
				>
					<button
						type="button"
						className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
						onClick={() => setLightboxIndex(null)}
					>
						&times;
					</button>
					<img
						src={images[lightboxIndex].url}
						alt={images[lightboxIndex].caption || ""}
						className="max-w-[90vw] max-h-[90vh] object-contain"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					/>
					{images[lightboxIndex].caption && (
						<p className="absolute bottom-8 text-white text-sm bg-black/60 px-4 py-2 rounded">
							{images[lightboxIndex].caption}
						</p>
					)}
				</div>
			)}
		</>
	);
}
