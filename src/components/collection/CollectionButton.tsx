import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { Check, Loader2, Package } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AddToCollectionModal } from "./AddToCollectionModal";

type OwnershipType = "Physical" | "Digital";

// DLC/Expansion/Addon categories that can't be added to collection
const DLC_CATEGORIES = [
	"DLC",
	"Expansion",
	"Standalone Expansion",
	"Bundle",
	"Pack",
	"Pack / Addon",
	"Mod",
	"Update",
];

interface CollectionButtonProps {
	gameId: string;
	gameName: string;
	gamePlatforms?: string[];
	categoryLabel?: string | null;
	onUpdate?: () => void;
}

const ownershipLabels: Record<OwnershipType, string> = {
	Physical: "Owned (Physical)",
	Digital: "Owned (Digital)",
};

const ownershipColors: Record<OwnershipType, string> = {
	Physical: "from-amber-600 to-orange-500",
	Digital: "from-blue-600 to-cyan-500",
};

export function CollectionButton({
	gameId,
	gameName,
	gamePlatforms = [],
	categoryLabel,
	onUpdate,
}: CollectionButtonProps) {
	const { user, isSignedIn } = useUser();
	const entry = useQuery(
		api.collections.getEntry,
		user?.id ? { clerkId: user.id, gameId: gameId as Id<"games"> } : "skip",
	);
	const isLoading = entry === undefined;
	const [showAddModal, setShowAddModal] = useState(false);

	const handleAddSuccess = () => {
		onUpdate?.();
	};

	// Check if this is a DLC/Expansion
	const isDLC = categoryLabel && DLC_CATEGORIES.includes(categoryLabel);

	if (!isSignedIn) {
		return null;
	}

	if (isLoading) {
		return (
			<button
				type="button"
				disabled
				className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg"
			>
				<Loader2 size={18} className="animate-spin" />
				Loading...
			</button>
		);
	}

	// DLC/Expansion - show disabled button with explanation
	if (isDLC && !entry) {
		return (
			<div className="relative group">
				<button
					type="button"
					disabled
					className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 text-gray-500 font-medium rounded-lg border border-gray-700/50 cursor-not-allowed"
				>
					<Package size={18} />
					Add to Collection
				</button>
				<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
					{categoryLabel} cannot be added to collection
				</div>
			</div>
		);
	}

	// Render button based on collection status, but always keep modal mounted
	return (
		<>
			{/* Not in collection - show add button */}
			{!entry ? (
				<button
					type="button"
					onClick={() => setShowAddModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-lg border border-gray-700 transition-all"
				>
					<Package size={18} />
					Add to Collection
				</button>
			) : (
				/* In collection - show owned status */
				<button
					type="button"
					onClick={() => setShowAddModal(true)}
					className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${ownershipColors[entry.ownershipType]} text-white font-medium rounded-lg shadow-lg hover:opacity-90 transition-all`}
				>
					<Check size={18} />
					{ownershipLabels[entry.ownershipType]}
				</button>
			)}

			{/* Modal always mounted, visibility controlled by showAddModal */}
			<AddToCollectionModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				onSuccess={handleAddSuccess}
				clerkId={user.id}
				gameId={gameId}
				gameName={gameName}
				gamePlatforms={gamePlatforms}
			/>
		</>
	);
}
