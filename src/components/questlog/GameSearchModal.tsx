import { useAction } from "convex/react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AddEntryModal } from "./AddEntryModal";

interface GameSearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	clerkId: string;
}

// biome-ignore lint/suspicious/noExplicitAny: Convex action return type
type SearchResult = any;

export function GameSearchModal({
	isOpen,
	onClose,
	onSuccess,
	clerkId,
}: GameSearchModalProps) {
	const searchGamesAction = useAction(api.igdb.searchAndCache);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Focus input when modal opens
	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	// Debounced search
	const performSearch = useCallback(
		async (searchQuery: string) => {
			if (!searchQuery.trim()) {
				setResults([]);
				return;
			}

			setIsSearching(true);
			try {
				const data = await searchGamesAction({ query: searchQuery });
				setResults(data);
			} catch (error) {
				console.error("Search failed:", error);
				setResults([]);
			} finally {
				setIsSearching(false);
			}
		},
		[searchGamesAction],
	);

	const handleQueryChange = (value: string) => {
		setQuery(value);

		// Clear existing timeout
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// Debounce search by 300ms
		debounceRef.current = setTimeout(() => {
			performSearch(value);
		}, 300);
	};

	const handleGameSelect = (game: SearchResult) => {
		setSelectedGame(game);
	};

	const handleEntrySuccess = () => {
		setSelectedGame(null);
		setQuery("");
		setResults([]);
		onSuccess?.();
		onClose();
	};

	const handleClose = () => {
		setQuery("");
		setResults([]);
		setSelectedGame(null);
		onClose();
	};

	if (!isOpen) return null;

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
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-lg max-h-[80vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-800">
					<h2 className="text-lg font-bold text-white">
						Add Game to Quest Log
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
					>
						<X size={18} />
					</button>
				</div>

				{/* Search Input */}
				<div className="p-5 border-b border-gray-800">
					<div className="relative">
						<Search
							size={18}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
						/>
						<input
							ref={inputRef}
							type="text"
							value={query}
							onChange={(e) => handleQueryChange(e.target.value)}
							placeholder="Search for a game..."
							className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
						/>
						{isSearching && (
							<Loader2
								size={18}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin"
							/>
						)}
					</div>
				</div>

				{/* Results */}
				<div className="flex-1 overflow-y-auto p-2">
					{!query.trim() ? (
						<div className="text-center py-8 text-gray-500">
							<Search size={32} className="mx-auto mb-2 opacity-50" />
							<p>Search for a game to add to your quest log</p>
						</div>
					) : results.length === 0 && !isSearching ? (
						<div className="text-center py-8 text-gray-500">
							<p>No games found for "{query}"</p>
						</div>
					) : (
						<div className="space-y-2">
							{results.map((game) => (
								<button
									key={game._id}
									type="button"
									onClick={() => handleGameSelect(game)}
									className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/50 rounded-xl transition-all text-left group"
								>
									{/* Game Cover */}
									<div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
										{game.coverUrl ? (
											<img
												src={game.coverUrl}
												alt={game.name}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
												No Image
											</div>
										)}
									</div>

									{/* Game Info */}
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
											{game.name}
										</h3>
										{game.releaseDate && (
											<p className="text-sm text-gray-500">
												{new Date(game.releaseDate).getFullYear()}
											</p>
										)}
									</div>

									{/* Add Icon */}
									<Plus
										size={20}
										className="text-gray-500 group-hover:text-purple-400 transition-colors"
									/>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
