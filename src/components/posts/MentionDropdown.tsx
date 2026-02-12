import { useAction, useQuery } from "convex/react";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { api } from "../../../convex/_generated/api";
import type { MentionData } from "../../lib/mentions";

export interface MentionDropdownRef {
	handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

interface MentionDropdownProps {
	triggerType: "user" | "game";
	query: string;
	selectedIndex: number;
	onSelect: (item: MentionData) => void;
	onSetSelectedIndex: (index: number) => void;
}

export const MentionDropdown = forwardRef<
	MentionDropdownRef,
	MentionDropdownProps
>(
	(
		{ triggerType, query, selectedIndex, onSelect, onSetSelectedIndex },
		ref,
	) => {
		const users = useQuery(
			api.users.searchUsersLight,
			triggerType === "user" && query ? { query, limit: 6 } : "skip",
		);

		const games = useQuery(
			api.games.searchGames,
			triggerType === "game" && query ? { query, limit: 6 } : "skip",
		);

		// Debounced IGDB search — fires when game query has 2+ chars and
		// local cache has few results. Results get cached into the DB,
		// which triggers the reactive searchGames query above to update.
		const searchIgdb = useAction(api.igdb.searchAndCache);
		const [igdbSearching, setIgdbSearching] = useState(false);
		const igdbSearchedRef = useRef<string>("");

		useEffect(() => {
			if (triggerType !== "game" || !query || query.length < 2) {
				setIgdbSearching(false);
				return;
			}

			// Skip if we already searched this exact query
			if (igdbSearchedRef.current === query) return;

			setIgdbSearching(true);
			const timer = setTimeout(() => {
				igdbSearchedRef.current = query;
				searchIgdb({ query, limit: 6 })
					.catch(() => {})
					.finally(() => setIgdbSearching(false));
			}, 300);

			return () => clearTimeout(timer);
		}, [triggerType, query, searchIgdb]);

		const freshItems: (MentionData & { sublabel?: string })[] =
			triggerType === "user"
				? (users || []).map((u) => ({
						type: "user" as const,
						id: u._id,
						slug: u.username,
						displayText: u.displayName || u.username,
					}))
				: (games || []).map((g) => {
						const parts: string[] = [];
						if (g.releaseDate) {
							parts.push(
								new Date(g.releaseDate * 1000).getFullYear().toString(),
							);
						}
						if (g.categoryLabel) {
							parts.push(g.categoryLabel);
						}
						return {
							type: "game" as const,
							id: g._id,
							slug: g.slug,
							displayText: g.name,
							sublabel: parts.length > 0 ? parts.join(" · ") : undefined,
						};
					});

		// Keep previous items visible while Convex loads new results
		const lastItemsRef = useRef(freshItems);
		if (freshItems.length > 0) {
			lastItemsRef.current = freshItems;
		}
		const isLoading =
			(triggerType === "user" && users === undefined) ||
			(triggerType === "game" && games === undefined);
		const items =
			freshItems.length > 0
				? freshItems
				: isLoading
					? lastItemsRef.current
					: [];

		useImperativeHandle(
			ref,
			() => ({
				handleKeyDown: (e: React.KeyboardEvent) => {
					if (items.length === 0) return false;

					if (e.key === "ArrowUp") {
						onSetSelectedIndex(
							selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1,
						);
						return true;
					}
					if (e.key === "ArrowDown") {
						onSetSelectedIndex(
							selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1,
						);
						return true;
					}
					if (e.key === "Enter") {
						const item = items[selectedIndex];
						if (item) onSelect(item);
						return true;
					}
					return false;
				},
			}),
			[items, selectedIndex, onSelect, onSetSelectedIndex],
		);

		// biome-ignore lint/correctness/useExhaustiveDependencies: reset index when items change
		useEffect(() => {
			onSetSelectedIndex(0);
		}, [items.length, onSetSelectedIndex]);

		if (!query) return null;

		return (
			<div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 w-64 max-h-48 overflow-y-auto">
				{items.length === 0 ? (
					<div className="px-3 py-2 text-sm text-gray-500">
						{igdbSearching ? "Searching..." : "No results found"}
					</div>
				) : null}
				{items.map((item, index) => (
					<button
						key={`${item.type}-${item.id}`}
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							onSelect(item);
						}}
						onMouseEnter={() => onSetSelectedIndex(index)}
						className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
							index === selectedIndex
								? "bg-gray-700 text-white"
								: "text-gray-300 hover:bg-gray-700/50"
						}`}
					>
						{triggerType === "user" ? (
							<>
								<UserAvatar user={users?.find((u) => u._id === item.id)} />
								<div className="min-w-0 flex-1">
									<span className="block truncate font-medium">
										{item.displayText}
									</span>
									<span className="block truncate text-xs text-gray-500">
										@{item.slug}
									</span>
								</div>
							</>
						) : (
							<div className="min-w-0 flex-1">
								<span className="block truncate font-medium">
									{item.displayText}
								</span>
								{item.sublabel && (
									<span className="block truncate text-xs text-gray-500">
										{item.sublabel}
									</span>
								)}
							</div>
						)}
					</button>
				))}
			</div>
		);
	},
);

MentionDropdown.displayName = "MentionDropdown";

function UserAvatar({
	user,
}: {
	user?: { avatarUrl?: string; username: string } | null;
}) {
	if (user?.avatarUrl) {
		return (
			<img
				src={user.avatarUrl}
				alt=""
				className="w-6 h-6 rounded-full object-cover flex-shrink-0"
			/>
		);
	}
	return (
		<div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
			<span className="text-xs font-bold text-gray-300">
				{(user?.username || "?")[0].toUpperCase()}
			</span>
		</div>
	);
}
