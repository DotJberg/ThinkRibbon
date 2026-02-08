// Transforms TipTap JSON to replace inline links in paragraphs with block-level linkPreview nodes.
// Only used for read-only rendering — the editor is untouched.

import { getEmbedInfo } from "./embed-utils";

interface TipTapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

interface TipTapNode {
	type: string;
	attrs?: Record<string, unknown>;
	content?: TipTapNode[];
	marks?: TipTapMark[];
	text?: string;
}

interface TipTapDoc {
	type: "doc";
	content?: TipTapNode[];
}

function hasLinkMark(node: TipTapNode): string | null {
	if (!node.marks) return null;
	const linkMark = node.marks.find((m) => m.type === "link");
	return linkMark?.attrs?.href as string | null;
}

function isStandaloneUrl(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	try {
		const url = new URL(trimmed);
		if (url.protocol === "http:" || url.protocol === "https:") {
			return trimmed;
		}
	} catch {
		// Not a URL
	}
	return null;
}

/** Returns true when the visible text of a linked node is itself a URL (pasted link). */
function isLinkDisplayingUrl(node: TipTapNode): boolean {
	return !!isStandaloneUrl(node.text || "");
}

function isEmptyParagraph(node: TipTapNode): boolean {
	if (!node.content || node.content.length === 0) return true;
	return node.content.every(
		(child) => child.type === "text" && (!child.text || !child.text.trim()),
	);
}

function splitParagraphAtLinks(paragraph: TipTapNode): TipTapNode[] {
	if (!paragraph.content) return [paragraph];

	// Check if any child has a link mark
	const hasAnyLink = paragraph.content.some((child) => hasLinkMark(child));

	// Fallback: detect standalone URL text without link marks
	if (!hasAnyLink) {
		const textChildren = paragraph.content.filter((c) => c.type === "text");
		const allText = textChildren.map((c) => c.text || "").join("");
		const url = isStandaloneUrl(allText);
		if (
			url &&
			getEmbedInfo(url) &&
			paragraph.content.every(
				(c) => c.type === "text" && (!c.marks || c.marks.length === 0),
			)
		) {
			return [{ type: "linkPreview", attrs: { href: url } }];
		}
		return [paragraph];
	}

	// If there's exactly one embed link and the surrounding text is trivial,
	// replace the entire paragraph with just the linkPreview node.
	const linkChildren = paragraph.content.filter((c) => hasLinkMark(c));
	if (linkChildren.length === 1) {
		const href = hasLinkMark(linkChildren[0]);
		if (href && getEmbedInfo(href) && isLinkDisplayingUrl(linkChildren[0])) {
			const nonLinkText = paragraph.content
				.filter((c) => !hasLinkMark(c))
				.map((c) => c.text || "")
				.join("")
				.trim();
			if (nonLinkText.length < 5) {
				return [{ type: "linkPreview", attrs: { href } }];
			}
		}
	}

	const result: TipTapNode[] = [];
	let currentChildren: TipTapNode[] = [];

	for (const child of paragraph.content) {
		const href = hasLinkMark(child);

		if (!href || !getEmbedInfo(href) || !isLinkDisplayingUrl(child)) {
			currentChildren.push(child);
			continue;
		}

		// Flush accumulated children as a paragraph fragment
		if (currentChildren.length > 0) {
			const frag: TipTapNode = {
				type: "paragraph",
				content: currentChildren,
			};
			if (!isEmptyParagraph(frag)) {
				result.push(frag);
			}
			currentChildren = [];
		}

		// Insert the link preview block
		result.push({
			type: "linkPreview",
			attrs: { href },
		});
	}

	// Flush remaining children
	if (currentChildren.length > 0) {
		const frag: TipTapNode = {
			type: "paragraph",
			content: currentChildren,
		};
		if (!isEmptyParagraph(frag)) {
			result.push(frag);
		}
	}

	return result;
}

function transformNodes(nodes: TipTapNode[]): TipTapNode[] {
	const result: TipTapNode[] = [];

	for (const node of nodes) {
		if (node.type === "paragraph") {
			result.push(...splitParagraphAtLinks(node));
		} else if (node.content) {
			// Recurse into wrapper nodes (blockquote, listItem, etc.)
			result.push({ ...node, content: transformNodes(node.content) });
		} else {
			result.push(node);
		}
	}

	return result;
}

export function transformContentForPreview(doc: TipTapDoc): TipTapDoc {
	if (!doc.content) return doc;
	return { ...doc, content: transformNodes(doc.content) };
}
