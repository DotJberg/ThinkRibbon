import { ExternalLink } from "lucide-react";
import { SafeImage } from "../shared/SafeImage";

interface LinkPreviewCardProps {
	url: string;
	title?: string;
	description?: string;
	imageUrl?: string;
	siteName?: string;
	domain: string;
}

export function LinkPreviewCard({
	url,
	title,
	description,
	imageUrl,
	siteName,
	domain,
}: LinkPreviewCardProps) {
	// Don't render if we have no useful metadata
	if (!title && !description && !imageUrl) {
		return null;
	}

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="block mt-3 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors group"
		>
			{imageUrl && (
				<div className="aspect-video bg-gray-800 overflow-hidden">
					<SafeImage
						src={imageUrl}
						alt={title || "Link preview"}
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						fallback={null}
					/>
				</div>
			)}
			<div className="p-3 bg-gray-800/50">
				<div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
					<ExternalLink size={12} />
					<span>{siteName || domain}</span>
				</div>
				{title && (
					<h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
						{title}
					</h4>
				)}
				{description && (
					<p className="text-xs text-gray-400 line-clamp-2 mt-1">
						{description}
					</p>
				)}
			</div>
		</a>
	);
}
