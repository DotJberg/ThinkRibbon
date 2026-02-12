import { Link } from "@tanstack/react-router";
import type { MentionData } from "./mentions";

/**
 * Renders post plain text content with mention display texts replaced by clickable links.
 * Falls back to plain text if no mentions are provided.
 */
export function renderPostContent(
	content: string,
	mentions?: MentionData[],
): React.ReactNode {
	if (!mentions || mentions.length === 0) {
		return content;
	}

	// Sort mentions by displayText length descending (prefer longest match first)
	const sorted = [...mentions].sort(
		(a, b) => b.displayText.length - a.displayText.length,
	);

	// Build segments: find all mention occurrences in content
	interface Segment {
		start: number;
		end: number;
		mention: MentionData;
	}

	const segments: Segment[] = [];

	for (const mention of sorted) {
		let searchFrom = 0;
		while (searchFrom < content.length) {
			const idx = content.indexOf(mention.displayText, searchFrom);
			if (idx === -1) break;

			// Check no overlap with existing segments
			const end = idx + mention.displayText.length;
			const overlaps = segments.some((s) => idx < s.end && end > s.start);

			if (!overlaps) {
				segments.push({ start: idx, end, mention });
			}

			searchFrom = idx + 1;
		}
	}

	if (segments.length === 0) {
		return content;
	}

	// Sort segments by start position
	segments.sort((a, b) => a.start - b.start);

	// Build React elements
	const elements: React.ReactNode[] = [];
	let lastEnd = 0;

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];

		// Text before this mention
		if (seg.start > lastEnd) {
			elements.push(content.slice(lastEnd, seg.start));
		}

		// The mention link
		if (seg.mention.type === "user") {
			elements.push(
				<Link
					key={`mention-${i}`}
					to="/profile/$username"
					params={{ username: seg.mention.slug }}
					className="text-sky-400 font-medium hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					{seg.mention.displayText}
				</Link>,
			);
		} else {
			elements.push(
				<Link
					key={`mention-${i}`}
					to="/games/$slug"
					params={{ slug: seg.mention.slug }}
					className="text-emerald-400 font-medium hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					{seg.mention.displayText}
				</Link>,
			);
		}

		lastEnd = seg.end;
	}

	// Remaining text after last mention
	if (lastEnd < content.length) {
		elements.push(content.slice(lastEnd));
	}

	return <>{elements}</>;
}
