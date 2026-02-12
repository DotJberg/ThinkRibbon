import type { SuggestionOptions } from "@tiptap/suggestion";
import { createRoot } from "react-dom/client";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
	MentionSuggestionList,
	type MentionSuggestionRef,
} from "./MentionSuggestion";

export function createSuggestionRender(): NonNullable<
	SuggestionOptions["render"]
> {
	let reactRoot: ReturnType<typeof createRoot> | null = null;
	let popup: TippyInstance[] = [];
	let component: MentionSuggestionRef | null = null;

	return () => ({
		onStart(props) {
			const container = document.createElement("div");
			reactRoot = createRoot(container);

			reactRoot.render(
				<MentionSuggestionList
					items={props.items}
					command={props.command}
					ref={(ref) => {
						component = ref;
					}}
				/>,
			);

			if (!props.clientRect) return;

			popup = tippy("body", {
				getReferenceClientRect: props.clientRect as () => DOMRect,
				appendTo: () => document.body,
				content: container,
				showOnCreate: true,
				interactive: true,
				trigger: "manual",
				placement: "bottom-start",
			});
		},

		onUpdate(props) {
			if (!reactRoot) return;
			reactRoot.render(
				<MentionSuggestionList
					items={props.items}
					command={props.command}
					ref={(ref) => {
						component = ref;
					}}
				/>,
			);

			if (props.clientRect && popup[0]) {
				popup[0].setProps({
					getReferenceClientRect: props.clientRect as () => DOMRect,
				});
			}
		},

		onKeyDown(props) {
			if (props.event.key === "Escape") {
				popup[0]?.hide();
				return true;
			}
			return component?.onKeyDown(props) ?? false;
		},

		onExit() {
			popup[0]?.destroy();
			// Delay unmount to avoid React warnings
			setTimeout(() => {
				reactRoot?.unmount();
				reactRoot = null;
			}, 0);
		},
	});
}
