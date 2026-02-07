import { mergeAttributes, Node } from "@tiptap/core";
import {
	NodeViewWrapper,
	type ReactNodeViewProps,
	ReactNodeViewRenderer,
} from "@tiptap/react";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getEmbedInfo } from "../../lib/embed-utils";
import { fetchLinkPreview, type LinkPreviewData } from "../../lib/link-preview";
import { EmbedRenderer } from "../shared/EmbedRenderer";
import { LinkPreviewCard } from "../shared/LinkPreviewCard";

function LinkPreviewComponent({ node }: ReactNodeViewProps) {
	const href = node.attrs.href as string;
	const embedInfo = useMemo(() => getEmbedInfo(href), [href]);
	const [preview, setPreview] = useState<LinkPreviewData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (embedInfo) return;
		let cancelled = false;
		fetchLinkPreview(href).then((data) => {
			if (!cancelled) {
				setPreview(data);
				setLoading(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [href, embedInfo]);

	if (embedInfo) {
		return (
			<NodeViewWrapper className="my-4 max-w-xl mx-auto">
				<EmbedRenderer embed={embedInfo} />
			</NodeViewWrapper>
		);
	}

	let domain: string;
	try {
		domain = new URL(href).hostname.replace(/^www\./, "");
	} catch {
		domain = href;
	}

	return (
		<NodeViewWrapper className="my-4 max-w-md mx-auto">
			{loading ? (
				<div className="border border-gray-700 rounded-lg overflow-hidden animate-pulse">
					<div className="aspect-video bg-gray-800" />
					<div className="p-3 bg-gray-800/50 space-y-2">
						<div className="h-3 w-24 bg-gray-700 rounded" />
						<div className="h-4 w-3/4 bg-gray-700 rounded" />
						<div className="h-3 w-1/2 bg-gray-700 rounded" />
					</div>
				</div>
			) : preview?.title || preview?.description || preview?.imageUrl ? (
				<LinkPreviewCard
					url={preview.url}
					title={preview.title}
					description={preview.description}
					imageUrl={preview.imageUrl}
					siteName={preview.siteName}
					domain={preview.domain}
				/>
			) : (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 px-3 py-2 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors text-sm text-gray-400 hover:text-gray-300"
				>
					<ExternalLink size={14} />
					<span className="truncate">{domain}</span>
				</a>
			)}
		</NodeViewWrapper>
	);
}

export const LinkPreviewExtension = Node.create({
	name: "linkPreview",
	group: "block",
	atom: true,

	addAttributes() {
		return {
			href: { default: null },
		};
	},

	parseHTML() {
		return [{ tag: "div[data-link-preview]" }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { "data-link-preview": "" }),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(LinkPreviewComponent);
	},
});
