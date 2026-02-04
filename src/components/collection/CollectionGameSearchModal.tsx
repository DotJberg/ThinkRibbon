import { Ban } from "lucide-react";
import { useState } from "react";
import type { GameSearchResult } from "@/types/game";
import { GameSearchModal } from "../shared/GameSearchModal";
import { AddToCollectionModal } from "./AddToCollectionModal";

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

interface CollectionGameSearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	clerkId: string;
}

export function CollectionGameSearchModal({
	isOpen,
	onClose,
	onSuccess,
	clerkId,
}: CollectionGameSearchModalProps) {
	const [selectedGame, setSelectedGame] = useState<
		(GameSearchResult & { platforms?: string[] }) | null
	>(null);

	const filterGame = (game: GameSearchResult): boolean | "disabled" => {
		// Disable DLC/Expansion categories
		if (game.categoryLabel && DLC_CATEGORIES.includes(game.categoryLabel)) {
			return "disabled";
		}
		return true;
	};

	const renderDisabledGame = (game: GameSearchResult) => (
		<div className="w-full flex items-center gap-3 p-3 bg-gray-800/30 border border-gray-700/30 rounded-xl opacity-60">
			<div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
				{game.coverUrl ? (
					<img
						src={game.coverUrl}
						alt={game.name}
						className="w-full h-full object-cover grayscale"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
						No Image
					</div>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<h3 className="font-semibold text-gray-400 truncate">{game.name}</h3>
					<span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-600/80 rounded text-xs font-medium text-gray-300">
						{game.categoryLabel}
					</span>
				</div>
				<p className="text-sm text-gray-500">Cannot add to collection</p>
			</div>
			<Ban size={20} className="text-gray-600" />
		</div>
	);

	const handleGameSelect = (game: GameSearchResult) => {
		// Store game with platforms for AddToCollectionModal
		setSelectedGame(game as GameSearchResult & { platforms?: string[] });
	};

	const handleEntrySuccess = () => {
		setSelectedGame(null);
		onSuccess?.();
		onClose();
	};

	const handleClose = () => {
		setSelectedGame(null);
		onClose();
	};

	return (
		<>
			{/* AddToCollectionModal - shown when game is selected */}
			<AddToCollectionModal
				isOpen={!!selectedGame}
				onClose={() => setSelectedGame(null)}
				onSuccess={handleEntrySuccess}
				clerkId={clerkId}
				gameId={selectedGame?._id ?? ""}
				gameName={selectedGame?.name ?? ""}
				gamePlatforms={selectedGame?.platforms ?? []}
			/>

			{/* Search modal - only shown when no game is selected */}
			{!selectedGame && (
				<GameSearchModal
					isOpen={isOpen}
					onClose={handleClose}
					onGameSelect={handleGameSelect}
					title="Add Game to Collection"
					emptyStateText="Search for a game to add to your collection"
					filterGame={filterGame}
					renderDisabledGame={renderDisabledGame}
				/>
			)}
		</>
	);
}
