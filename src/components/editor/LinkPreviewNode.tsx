import { mergeAttributes, Node } from "@tiptap/core";
import {
	NodeViewWrapper,
	type ReactNodeViewProps,
	ReactNodeViewRenderer,
} from "@tiptap/react";
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { getEmbedInfo } from "../../lib/embed-utils";
import { EmbedRenderer } from "../shared/EmbedRenderer";

function LinkPreviewComponent({ node }: ReactNodeViewProps) {
	const href = node.attrs.href as string;
	const embedInfo = useMemo(() => getEmbedInfo(href), [href]);

	if (embedInfo) {
		return (
			<NodeViewWrapper className="my-4 max-w-xl mx-auto">
				<EmbedRenderer embed={embedInfo} />
			</NodeViewWrapper>
		);
	}

	// Fallback: render as a simple link (should rarely happen now that
	// transformContentForPreview only creates linkPreview nodes for embeds)
	let domain: string;
	try {
		domain = new URL(href).hostname.replace(/^www\./, "");
	} catch {
		domain = href;
	}

	return (
		<NodeViewWrapper className="my-4 max-w-md mx-auto">
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2 px-3 py-2 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors text-sm text-gray-400 hover:text-gray-300"
			>
				<ExternalLink size={14} />
				<span className="truncate">{domain}</span>
			</a>
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
