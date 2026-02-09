import { Compass, Star, Users } from "lucide-react";

export type PrimaryTab = "discover" | "reviews" | "following";
export type SubFilter = "latest" | "popular";

interface FeedSelectorProps {
	activeTab: PrimaryTab;
	subFilter: SubFilter;
	onTabChange: (tab: PrimaryTab) => void;
	onSubFilterChange: (filter: SubFilter) => void;
	isSignedIn: boolean;
}

const primaryTabs: {
	id: PrimaryTab;
	label: string;
	icon: typeof Compass;
	authOnly?: boolean;
}[] = [
	{ id: "discover", label: "Discover", icon: Compass },
	{ id: "reviews", label: "Reviews", icon: Star },
	{ id: "following", label: "Following", icon: Users, authOnly: true },
];

export function FeedSelector({
	activeTab,
	subFilter,
	onTabChange,
	onSubFilterChange,
	isSignedIn,
}: FeedSelectorProps) {
	const showSubFilter = activeTab === "discover" || activeTab === "reviews";

	return (
		<div className="space-y-2">
			{/* Primary tabs */}
			<div className="flex gap-2 flex-wrap">
				{primaryTabs
					.filter((t) => !t.authOnly || isSignedIn)
					.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => onTabChange(tab.id)}
								className={`flex items-center gap-1.5 px-3 py-1.5 sm:gap-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-full font-medium transition-all ${
									isActive
										? "bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg shadow-slate-500/20"
										: "bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700"
								}`}
							>
								<Icon size={18} />
								{tab.label}
							</button>
						);
					})}
			</div>

			{/* Sub-filter row */}
			{showSubFilter && (
				<div className="flex gap-1 ml-1">
					{(["latest", "popular"] as const).map((filter) => (
						<button
							key={filter}
							type="button"
							onClick={() => onSubFilterChange(filter)}
							className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
								subFilter === filter
									? "bg-gray-700 text-white"
									: "text-gray-500 hover:text-gray-300"
							}`}
						>
							{filter === "latest" ? "Latest" : "Popular"}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
