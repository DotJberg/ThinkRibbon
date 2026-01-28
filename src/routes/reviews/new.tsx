import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Cloud,
	FileText,
	Gamepad2,
	Save,
	Search,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { CoverImageUpload } from "../../components/editor/CoverImageUpload";
import { NavigationWarning } from "../../components/editor/NavigationWarning";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { SpoilerToggle } from "../../components/shared/SpoilerWarning";
import { StarRating } from "../../components/shared/StarRating";
import {
	deleteReviewDraft,
	getReviewDrafts,
	saveReviewDraft,
} from "../../lib/server/drafts";
import { searchGames } from "../../lib/server/games";
import { createReview } from "../../lib/server/reviews";

export const Route = createFileRoute("/reviews/new")({
	component: NewReviewPage,
	validateSearch: (search: Record<string, unknown>) => ({
		gameId: search.gameId as string | undefined,
		draftId: search.draftId as string | undefined,
	}),
});

function NewReviewPage() {
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const { gameId, draftId: initialDraftId } = Route.useSearch();
	const id = useId();

	// Game selection state
	const [selectedGame, setSelectedGame] = useState<{
		id: string;
		name: string;
		coverUrl: string | null;
	} | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Awaited<ReturnType<typeof searchGames>>
	>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Form state
	const [title, setTitle] = useState("");
	const [content, setContent] = useState(""); // TipTap JSON string
	const [rating, setRating] = useState(0);
	const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
	const [coverFileKey, setCoverFileKey] = useState<string | null>(null);
	const [containsSpoilers, setContainsSpoilers] = useState(false);

	// Draft state
	const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [showDraftPicker, setShowDraftPicker] = useState(false);
	const [availableDrafts, setAvailableDrafts] = useState<
		Awaited<ReturnType<typeof getReviewDrafts>>
	>([]);

	// Submission state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasPublished, setHasPublished] = useState(false);

	// Auto-save debounce ref
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Track if there are unsaved changes (for navigation warning)
	const hasUnsavedChanges =
		!hasPublished &&
		(title.trim() !== "" || content.trim() !== "" || rating > 0);

	// Load pre-selected game
	useEffect(() => {
		if (gameId) {
			// We'd need to fetch the game by ID - for now just show the form
		}
	}, [gameId]);

	// Load draft if draftId is provided
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadDraft is defined later and would cause infinite loop if included
	useEffect(() => {
		if (initialDraftId && user) {
			loadDraft(initialDraftId);
		}
	}, [initialDraftId, user]);

	// Load available drafts
	useEffect(() => {
		if (user && !initialDraftId) {
			getReviewDrafts({ data: user.id }).then((drafts) => {
				setAvailableDrafts(drafts);
				if (drafts.length > 0 && !draftId) {
					setShowDraftPicker(true);
				}
			});
		}
	}, [user, initialDraftId, draftId]);

	const loadDraft = async (id: string) => {
		if (!user) return;
		try {
			const drafts = await getReviewDrafts({ data: user.id });
			const draft = drafts.find((d) => d.id === id);
			if (draft) {
				setTitle(draft.title || "");
				setContent(draft.content || "");
				setRating(draft.rating || 0);
				setCoverImageUrl(draft.coverImageUrl);
				setCoverFileKey(draft.coverFileKey);
				setContainsSpoilers(draft.containsSpoilers);
				setDraftId(draft.id);
				// Note: Game selection from draft.gameId would need additional logic to fetch game details
				toast.success("Draft loaded");
			}
		} catch (error) {
			console.error("Failed to load draft:", error);
		}
	};

	// Auto-save function
	const autoSave = useCallback(async () => {
		if (!user || !title.trim()) return;

		setSaveStatus("saving");
		try {
			const result = await saveReviewDraft({
				data: {
					draftId,
					title,
					content,
					rating: rating > 0 ? rating : undefined,
					coverImageUrl: coverImageUrl || undefined,
					coverFileKey: coverFileKey || undefined,
					containsSpoilers,
					gameId: selectedGame?.id,
					authorClerkId: user.id,
				},
			});
			setDraftId(result.id);
			setLastSaved(new Date());
			setSaveStatus("saved");
		} catch (error) {
			console.error("Auto-save failed:", error);
			setSaveStatus("idle");
		}
	}, [
		user,
		draftId,
		title,
		content,
		rating,
		coverImageUrl,
		coverFileKey,
		containsSpoilers,
		selectedGame,
	]);

	// Debounced auto-save on content changes
	useEffect(() => {
		if (!title.trim()) return;

		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		setSaveStatus("idle");
		saveTimeoutRef.current = setTimeout(() => {
			autoSave();
		}, 2000);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [title, autoSave]);

	// Handle search
	useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchResults([]);
			return;
		}

		const timeoutId = setTimeout(async () => {
			setIsSearching(true);
			try {
				const results = await searchGames({
					data: { query: searchQuery, limit: 5 },
				});
				setSearchResults(results);
			} catch (error) {
				console.error("Search failed:", error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery]);

	const handleCoverUpload = (url: string, fileKey: string) => {
		setCoverImageUrl(url);
		setCoverFileKey(fileKey);
	};

	const handleCoverRemove = () => {
		setCoverImageUrl(null);
		setCoverFileKey(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!user ||
			!selectedGame ||
			!title.trim() ||
			!content.trim() ||
			rating === 0
		)
			return;

		setIsSubmitting(true);
		try {
			const review = await createReview({
				data: {
					title,
					content, // This is now JSON string from TipTap
					rating,
					gameId: selectedGame.id,
					coverImageUrl: coverImageUrl || undefined,
					coverFileKey: coverFileKey || undefined,
					containsSpoilers,
					published: true,
					authorClerkId: user.id,
				},
			});

			// Delete the draft if it exists
			if (draftId) {
				await deleteReviewDraft({ data: { draftId, clerkId: user.id } });
			}

			setHasPublished(true);
			navigate({ to: "/reviews/$id", params: { id: review.id } });
		} catch (error) {
			console.error("Failed to create review:", error);
			toast.error(
				"Failed to create review. You may have already reviewed this game.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDraftSelect = (selectedDraftId: string) => {
		loadDraft(selectedDraftId);
		setShowDraftPicker(false);
	};

	const handleStartFresh = () => {
		setShowDraftPicker(false);
	};

	const handleDeleteDraftOnLeave = async () => {
		if (draftId && user) {
			await deleteReviewDraft({ data: { draftId, clerkId: user.id } });
		}
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Sign in to write a review
					</h1>
					<Link to="/sign-in" className="text-purple-400 hover:underline">
						Sign In
					</Link>
				</div>
			</div>
		);
	}

	// Draft picker modal
	if (showDraftPicker && availableDrafts.length > 0) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center p-4">
				<div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-6">
					<div className="flex items-center gap-3 mb-6">
						<FileText className="text-purple-400" size={24} />
						<h2 className="text-xl font-semibold text-white">
							Resume a Draft?
						</h2>
					</div>

					<p className="text-gray-400 mb-4">
						You have {availableDrafts.length} saved review draft
						{availableDrafts.length > 1 ? "s" : ""}. Would you like to continue
						where you left off?
					</p>

					<div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
						{availableDrafts.map((draft) => (
							<button
								key={draft.id}
								type="button"
								onClick={() => handleDraftSelect(draft.id)}
								className="w-full p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-left transition-colors"
							>
								<p className="text-white font-medium truncate">
									{draft.title || "Untitled Review"}
								</p>
								<p className="text-sm text-gray-500">
									{draft.rating ? `${draft.rating}/5 stars • ` : ""}
									Last edited {new Date(draft.updatedAt).toLocaleDateString()}
								</p>
							</button>
						))}
					</div>

					<div className="flex gap-3">
						<button
							type="button"
							onClick={handleStartFresh}
							className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
						>
							Start Fresh
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<Toaster position="top-right" theme="dark" />
			<NavigationWarning
				hasUnsavedChanges={hasUnsavedChanges}
				draftId={draftId}
				onDeleteDraft={handleDeleteDraftOnLeave}
			/>

			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="flex items-center justify-between mb-6">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
					>
						<ArrowLeft size={20} />
						Back
					</Link>

					{/* Save status indicator */}
					<div className="flex items-center gap-2 text-sm">
						{saveStatus === "saving" && (
							<>
								<Cloud className="text-gray-400 animate-pulse" size={16} />
								<span className="text-gray-400">Saving...</span>
							</>
						)}
						{saveStatus === "saved" && lastSaved && (
							<>
								<Save className="text-green-400" size={16} />
								<span className="text-green-400">
									Saved {lastSaved.toLocaleTimeString()}
								</span>
							</>
						)}
					</div>
				</div>

				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-white">Write a Review</h1>
					<Link
						to="/drafts"
						className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white text-sm font-medium"
					>
						<FileText size={16} />
						My Drafts
					</Link>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Game Selection */}
					{!selectedGame ? (
						<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
							<label
								htmlFor={`${id}-game-search`}
								className="block text-sm font-medium text-gray-300 mb-4"
							>
								Select a Game
							</label>
							<div className="relative">
								<Search
									className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 ${isSearching ? "animate-pulse" : ""}`}
									size={20}
								/>
								<input
									id={`${id}-game-search`}
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search for a game..."
									className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
								/>
							</div>

							{/* Search Results */}
							{searchResults.length > 0 && (
								<div className="mt-4 space-y-2">
									{searchResults.map((game) => (
										<button
											key={game.id}
											type="button"
											onClick={() => {
												setSelectedGame({
													id: game.id,
													name: game.name,
													coverUrl: game.coverUrl,
												});
												setSearchQuery("");
												setSearchResults([]);
											}}
											className="w-full flex items-center gap-3 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
										>
											{game.coverUrl ? (
												<img
													src={game.coverUrl}
													alt=""
													className="w-10 h-14 object-cover rounded"
												/>
											) : (
												<Gamepad2 className="w-10 h-14 text-gray-500" />
											)}
											<span className="text-white font-medium">
												{game.name}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					) : (
						<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4">
							{selectedGame.coverUrl ? (
								<img
									src={selectedGame.coverUrl}
									alt=""
									className="w-16 h-20 object-cover rounded"
								/>
							) : (
								<div className="w-16 h-20 bg-gray-700 rounded flex items-center justify-center">
									<Gamepad2 className="w-8 h-8 text-gray-500" />
								</div>
							)}
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-white">
									{selectedGame.name}
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setSelectedGame(null)}
								className="text-gray-400 hover:text-white"
							>
								Change
							</button>
						</div>
					)}

					{/* Cover Image */}
					<CoverImageUpload
						currentUrl={coverImageUrl}
						onUpload={handleCoverUpload}
						onRemove={handleCoverRemove}
						uploadEndpoint="reviewCover"
					/>

					{/* Rating */}
					<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
						<span className="block text-sm font-medium text-gray-300 mb-4">
							Your Rating
						</span>
						<StarRating
							rating={rating}
							size="lg"
							interactive
							onChange={setRating}
						/>
					</div>

					{/* Title */}
					<div>
						<label
							htmlFor={`${id}-title`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Review Title
						</label>
						<input
							id={`${id}-title`}
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Give your review a title..."
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
							required
						/>
					</div>

					{/* Spoiler Toggle */}
					<SpoilerToggle
						checked={containsSpoilers}
						onChange={setContainsSpoilers}
					/>

					{/* Content - Rich Text Editor */}
					<div>
						<span className="block text-sm font-medium text-gray-300 mb-2">
							Your Review
						</span>
						<RichTextEditor
							content={content}
							onChange={setContent}
							placeholder="Write your thoughts about this game..."
							uploadEndpoint="reviewInlineImage"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || !selectedGame || rating === 0}
						className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? "Publishing..." : "Publish Review"}
					</button>
				</form>
			</div>
		</div>
	);
}
