const SITE_NAME = "Think Ribbon";
const BASE_URL = "https://www.thinkribbon.com";

export function seoTitle(title: string): string {
	return `${title} - ${SITE_NAME}`;
}

export function seoUrl(path: string): string {
	return `${BASE_URL}${path}`;
}

export function truncate(text: string, maxLength = 155): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3)}...`;
}

/** Extract plain text from TipTap JSON content or return as-is if plain text */
export function extractTextFromContent(content: string): string {
	if (!content.startsWith("{") && !content.startsWith("[")) {
		return content;
	}
	try {
		const doc = JSON.parse(content);
		return extractTextFromNode(doc);
	} catch {
		return content;
	}
}

function extractTextFromNode(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as { type?: string; text?: string; content?: unknown[] };
	if (n.type === "text" && typeof n.text === "string") return n.text;
	if (Array.isArray(n.content)) {
		return n.content.map(extractTextFromNode).join("");
	}
	return "";
}

type MetaTag =
	| { title: string }
	| { name: string; content: string }
	| { property: string; content: string }
	| { charSet: string };

interface SeoMetaOptions {
	title: string;
	description: string;
	url: string;
	image?: string;
	type?: string;
	extra?: MetaTag[];
}

export function buildMeta({
	title,
	description,
	url,
	image,
	type = "article",
	extra = [],
}: SeoMetaOptions): MetaTag[] {
	const meta: MetaTag[] = [
		{ title },
		{ name: "description", content: description },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: url },
		{ property: "og:type", content: type },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
	];

	if (image) {
		meta.push(
			{ property: "og:image", content: image },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:image", content: image },
		);
	}

	meta.push(...extra);
	return meta;
}
