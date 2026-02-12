import { useCallback, useState } from "react";
import type { MentionData } from "../lib/mentions";

interface MentionAutocompleteState {
	isOpen: boolean;
	triggerType: "user" | "game" | null;
	query: string;
	triggerIndex: number;
	selectedIndex: number;
	mentions: MentionData[];
}

export function useMentionAutocomplete() {
	const [state, setState] = useState<MentionAutocompleteState>({
		isOpen: false,
		triggerType: null,
		query: "",
		triggerIndex: -1,
		selectedIndex: 0,
		mentions: [],
	});

	const detectTrigger = useCallback((text: string, cursorPos: number) => {
		setState((prev) => {
			// When dropdown is already open, use positional tracking instead of re-running regex.
			// This prevents flickering caused by brief state inconsistencies during re-detection.
			if (prev.isOpen && prev.triggerIndex >= 0) {
				const triggerChar = text[prev.triggerIndex];

				// Close if trigger character was deleted or cursor moved before it
				if (
					(triggerChar !== "@" && triggerChar !== "#") ||
					cursorPos <= prev.triggerIndex
				) {
					return {
						...prev,
						isOpen: false,
						triggerType: null,
						query: "",
						triggerIndex: -1,
					};
				}

				const query = text.slice(prev.triggerIndex + 1, cursorPos);

				// For @ triggers: close on whitespace (usernames are single-word)
				if (prev.triggerType === "user" && /\s/.test(query)) {
					return {
						...prev,
						isOpen: false,
						triggerType: null,
						query: "",
						triggerIndex: -1,
					};
				}

				// For # triggers: close on newline, tab, another #, or >60 chars
				if (
					prev.triggerType === "game" &&
					(/[\n\t#]/.test(query) || query.length > 60)
				) {
					return {
						...prev,
						isOpen: false,
						triggerType: null,
						query: "",
						triggerIndex: -1,
					};
				}

				return { ...prev, query, selectedIndex: 0 };
			}

			// When dropdown is closed, use regex to detect a new trigger
			const before = text.slice(0, cursorPos);

			const atMatch = before.match(/(^|\s)@(\S*)$/);
			const hashMatch = before.match(/(^|\s)#([^\n\t#]{0,60})$/);

			type Trigger = {
				index: number;
				query: string;
				triggerType: "user" | "game";
			};
			let result: Trigger | null = null;

			if (atMatch != null && atMatch.index != null) {
				result = {
					index: atMatch.index + atMatch[1].length,
					query: atMatch[2],
					triggerType: "user",
				};
			}

			if (hashMatch != null && hashMatch.index != null) {
				const candidate: Trigger = {
					index: hashMatch.index + hashMatch[1].length,
					query: hashMatch[2],
					triggerType: "game",
				};
				if (!result || candidate.index > result.index) {
					result = candidate;
				}
			}

			if (result) {
				return {
					...prev,
					isOpen: true,
					triggerType: result.triggerType,
					query: result.query,
					triggerIndex: result.index,
					selectedIndex: 0,
				};
			}

			return prev.isOpen
				? {
						...prev,
						isOpen: false,
						triggerType: null,
						query: "",
						triggerIndex: -1,
					}
				: prev;
		});
	}, []);

	const close = useCallback(() => {
		setState((prev) => ({
			...prev,
			isOpen: false,
			triggerType: null,
			query: "",
			triggerIndex: -1,
			selectedIndex: 0,
		}));
	}, []);

	const selectItem = useCallback(
		(
			item: MentionData,
			content: string,
			setContent: (value: string) => void,
		) => {
			// Read trigger position from current state via setState to avoid stale closure
			setState((prev) => {
				const { triggerIndex, query } = prev;
				// Replace trigger + query with display text
				const before = content.slice(0, triggerIndex);
				const after = content.slice(triggerIndex + 1 + query.length);
				const newContent = `${before}${item.displayText}${after}`;
				setContent(newContent);

				const exists = prev.mentions.some(
					(m) => m.type === item.type && m.id === item.id,
				);
				return {
					...prev,
					isOpen: false,
					triggerType: null,
					query: "",
					triggerIndex: -1,
					selectedIndex: 0,
					mentions: exists ? prev.mentions : [...prev.mentions, item],
				};
			});
		},
		[],
	);

	const setSelectedIndex = useCallback((index: number) => {
		setState((prev) => ({ ...prev, selectedIndex: index }));
	}, []);

	const clearMentions = useCallback(() => {
		setState((prev) => ({ ...prev, mentions: [] }));
	}, []);

	return {
		isOpen: state.isOpen,
		triggerType: state.triggerType,
		query: state.query,
		selectedIndex: state.selectedIndex,
		mentions: state.mentions,
		detectTrigger,
		close,
		selectItem,
		setSelectedIndex,
		clearMentions,
	};
}
