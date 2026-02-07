// Transforms TipTap JSON to replace inline links in paragraphs with block-level linkPreview nodes.
// Only used for read-only rendering — the editor is untouched.

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
	if (!hasAnyLink) return [paragraph];

	const result: TipTapNode[] = [];
	let currentChildren: TipTapNode[] = [];

	for (const child of paragraph.content) {
		const href = hasLinkMark(child);

		if (!href) {
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

export function transformContentForPreview(doc: TipTapDoc): TipTapDoc {
	if (!doc.content) return doc;

	const hasAnyLink = doc.content.some(
		(node) =>
			node.type === "paragraph" &&
			node.content?.some((child) => hasLinkMark(child)),
	);

	if (!hasAnyLink) return doc;

	const newContent: TipTapNode[] = [];

	for (const node of doc.content) {
		if (node.type === "paragraph") {
			newContent.push(...splitParagraphAtLinks(node));
		} else {
			newContent.push(node);
		}
	}

	return { ...doc, content: newContent };
}
