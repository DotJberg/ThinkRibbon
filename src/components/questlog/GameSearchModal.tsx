import { useState } from "react";
import type { GameSearchResult } from "@/types/game";
import { GameSearchModal } from "../shared/GameSearchModal";
import { AddEntryModal } from "./AddEntryModal";

interface QuestLogGameSearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	clerkId: string;
}

export function QuestLogGameSearchModal({
	isOpen,
	onClose,
	onSuccess,
	clerkId,
}: QuestLogGameSearchModalProps) {
	const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(
		null,
	);

	const handleGameSelect = (game: GameSearchResult) => {
		setSelectedGame(game);
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

	// If a game is selected, show the AddEntryModal
	if (selectedGame) {
		return (
			<AddEntryModal
				isOpen={true}
				onClose={() => setSelectedGame(null)}
				onSuccess={handleEntrySuccess}
				clerkId={clerkId}
				gameId={selectedGame._id}
				gameName={selectedGame.name}
			/>
		);
	}

	return (
		<GameSearchModal
			isOpen={isOpen}
			onClose={handleClose}
			onGameSelect={handleGameSelect}
			title="Add Game to Quest Log"
			emptyStateText="Search for a game to add to your quest log"
		/>
	);
}

// Re-export as original name for backwards compatibility
export { QuestLogGameSearchModal as GameSearchModal };
