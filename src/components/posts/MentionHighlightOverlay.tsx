import { type RefObject, useCallback, useEffect, useRef } from "react";
import type { MentionData } from "../../lib/mentions";

interface MentionHighlightOverlayProps {
	content: string;
	mentions: MentionData[];
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	className: string;
}

/**
 * Renders a styled backdrop behind a textarea to highlight mention text.
 * The paired textarea should use `text-transparent` and `caret-white` so
 * the user sees this layer's colored spans while still typing normally.
 */
export function MentionHighlightOverlay({
	content,
	mentions,
	textareaRef,
	className,
}: MentionHighlightOverlayProps) {
	const backdropRef = useRef<HTMLDivElement>(null);

	const syncScroll = useCallback(() => {
		if (textareaRef.current && backdropRef.current) {
			backdropRef.current.scrollTop = textareaRef.current.scrollTop;
		}
	}, [textareaRef]);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.addEventListener("scroll", syncScroll);
		return () => textarea.removeEventListener("scroll", syncScroll);
	}, [textareaRef, syncScroll]);

	return (
		<div
			ref={backdropRef}
			aria-hidden="true"
			className={`${className} absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words text-white`}
		>
			{highlightMentions(content, mentions)}
		</div>
	);
}

function highlightMentions(
	text: string,
	mentions: MentionData[],
): React.ReactNode {
	if (mentions.length === 0 || text.length === 0) return text;

	// Build highlight ranges from mention display texts
	const ranges: { start: number; end: number; type: "user" | "game" }[] = [];
	const used = new Set<number>();

	for (const m of mentions) {
		let searchFrom = 0;
		while (searchFrom < text.length) {
			const idx = text.indexOf(m.displayText, searchFrom);
			if (idx === -1) break;
			// Skip if this range overlaps an already-claimed range
			if (!used.has(idx)) {
				ranges.push({
					start: idx,
					end: idx + m.displayText.length,
					type: m.type,
				});
				for (let i = idx; i < idx + m.displayText.length; i++) used.add(i);
				break;
			}
			searchFrom = idx + 1;
		}
	}

	if (ranges.length === 0) return text;

	ranges.sort((a, b) => a.start - b.start);

	const elements: React.ReactNode[] = [];
	let lastEnd = 0;

	for (const range of ranges) {
		if (range.start > lastEnd) {
			elements.push(text.slice(lastEnd, range.start));
		}
		elements.push(
			<span
				key={range.start}
				className={
					range.type === "user"
						? "text-sky-400 font-medium"
						: "text-emerald-400 font-medium"
				}
			>
				{text.slice(range.start, range.end)}
			</span>,
		);
		lastEnd = range.end;
	}

	if (lastEnd < text.length) {
		elements.push(text.slice(lastEnd));
	}

	return elements;
}
