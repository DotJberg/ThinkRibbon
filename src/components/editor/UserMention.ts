import Mention from "@tiptap/extension-mention";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { MentionSuggestionItem } from "./MentionSuggestion";
import { createSuggestionRender } from "./mentionSuggestionRender";

export function createUserMention(convex: ConvexReactClient) {
	return Mention.extend({
		name: "userMention",

		addAttributes() {
			return {
				...this.parent?.(),
				username: {
					default: null,
					parseHTML: (element: HTMLElement) =>
						element.getAttribute("data-username"),
					renderHTML: (attributes: Record<string, unknown>) =>
						attributes.username ? { "data-username": attributes.username } : {},
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
			class: "text-sky-400 font-medium",
			"data-type": "userMention",
		},
		suggestion: {
			char: "@",
			items: async ({
				query,
			}: {
				query: string;
			}): Promise<MentionSuggestionItem[]> => {
				if (!query) return [];
				const results = await convex.query(api.users.searchUsersLight, {
					query,
					limit: 8,
				});
				return results.map((u) => ({
					id: u._id,
					label: u.displayName || u.username,
					sublabel: `@${u.username}`,
					imageUrl: u.avatarUrl,
					username: u.username,
					displayText: u.displayName || u.username,
				})) as MentionSuggestionItem[];
			},
			render: createSuggestionRender(),
			command: ({ editor, range, props }) => {
				const item = props as MentionSuggestionItem & {
					username?: string;
					displayText?: string;
				};
				editor
					.chain()
					.focus()
					.insertContentAt(range, [
						{
							type: "userMention",
							attrs: {
								id: item.id,
								label: item.displayText || item.label,
								username: item.username || item.sublabel?.replace("@", ""),
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
