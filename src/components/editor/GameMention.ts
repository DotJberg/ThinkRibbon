import Mention from "@tiptap/extension-mention";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { MentionSuggestionItem } from "./MentionSuggestion";
import { createSuggestionRender } from "./mentionSuggestionRender";

export function createGameMention(convex: ConvexReactClient) {
	return Mention.extend({
		name: "gameMention",

		addAttributes() {
			return {
				...this.parent?.(),
				slug: {
					default: null,
					parseHTML: (element: HTMLElement) =>
						element.getAttribute("data-slug"),
					renderHTML: (attributes: Record<string, unknown>) =>
						attributes.slug ? { "data-slug": attributes.slug } : {},
				},
				displayText: {
					default: null,
					parseHTML: (element: HTMLElement) =>
						element.getAttribute("data-display-text"),
					renderHTML: (attributes: Record<string, unknown>) =>
						attributes.displayText
							? { "data-display-text": attributes.displayText }
							: {},
				},
			};
		},
	}).configure({
		HTMLAttributes: {
			class: "text-emerald-400 font-medium",
			"data-type": "gameMention",
		},
		suggestion: {
			char: "#",
			allowSpaces: true,
			items: async ({
				query,
			}: {
				query: string;
			}): Promise<MentionSuggestionItem[]> => {
				if (!query) return [];
				const results = await convex.query(api.games.searchGames, {
					query,
					limit: 8,
				});
				return results.map((g) => {
					const parts: string[] = [];
					if (g.releaseDate) {
						parts.push(new Date(g.releaseDate * 1000).getFullYear().toString());
					}
					if (g.categoryLabel) {
						parts.push(g.categoryLabel);
					}
					return {
						id: g._id,
						label: g.name,
						sublabel: parts.length > 0 ? parts.join(" · ") : undefined,
						slug: g.slug,
						displayText: g.name,
					};
				}) as MentionSuggestionItem[];
			},
			render: createSuggestionRender(),
			command: ({ editor, range, props }) => {
				const item = props as MentionSuggestionItem & {
					slug?: string;
					displayText?: string;
				};
				editor
					.chain()
					.focus()
					.insertContentAt(range, [
						{
							type: "gameMention",
							attrs: {
								id: item.id,
								label: item.displayText || item.label,
								slug: item.slug,
								displayText: item.displayText || item.label,
							},
						},
						{ type: "text", text: " " },
					])
					.run();
			},
		},
		renderLabel({ node }) {
			return node.attrs.displayText || node.attrs.label || "";
		},
	});
}
