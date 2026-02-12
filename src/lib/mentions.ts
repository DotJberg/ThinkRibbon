export interface MentionData {
	type: "user" | "game";
	id: string;
	slug: string;
	displayText: string;
}

/**
 * Walk a TipTap JSON document tree and extract all mention nodes.
 */
export function extractMentionsFromTipTap(
	json: Record<string, unknown>,
): MentionData[] {
	const mentions: MentionData[] = [];
	const seen = new Set<string>();

	function walk(node: Record<string, unknown>) {
		if (
			node.type === "userMention" &&
			node.attrs &&
			typeof node.attrs === "object"
		) {
			const attrs = node.attrs as Record<string, unknown>;
			const key = `user-${attrs.id}`;
			if (!seen.has(key)) {
				seen.add(key);
				mentions.push({
					type: "user",
					id: attrs.id as string,
					slug: attrs.username as string,
					displayText: attrs.displayText as string,
				});
			}
		}

		if (
			node.type === "gameMention" &&
			node.attrs &&
			typeof node.attrs === "object"
		) {
			const attrs = node.attrs as Record<string, unknown>;
			const key = `game-${attrs.id}`;
			if (!seen.has(key)) {
				seen.add(key);
				mentions.push({
					type: "game",
					id: attrs.id as string,
					slug: attrs.slug as string,
					displayText: attrs.displayText as string,
				});
			}
		}

		if (Array.isArray(node.content)) {
			for (const child of node.content) {
				if (child && typeof child === "object") {
					walk(child as Record<string, unknown>);
				}
			}
		}
	}

	walk(json);
	return mentions;
}
