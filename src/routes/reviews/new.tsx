import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
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
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getRatingLabel } from "../../../convex/ratings";
import { CoverImageUpload } from "../../components/editor/CoverImageUpload";
import { NavigationWarning } from "../../components/editor/NavigationWarning";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { GenreSelector } from "../../components/shared/GenreSelector";
import { SpoilerToggle } from "../../components/shared/SpoilerWarning";
import { StarRating } from "../../components/shared/StarRating";
import { TagSelector } from "../../components/shared/TagSelector";
import { normalizeIgdbGenres } from "../../lib/genres";
import {
	extractMentionsFromTipTap,
	type MentionData,
} from "../../lib/mentions";

export const Route = createFileRoute("/reviews/new")({
	component: NewReviewPage,
	validateSearch: (
		search: Record<string, unknown>,
	): {
		gameId?: string;
		draftId?: string;
		rating?: number;
	} => ({
		gameId: search.gameId as string | undefined,
		draftId: search.draftId as string | undefined,
		rating: search.rating ? Number(search.rating) : undefined,
	}),
});

function NewReviewPage() {
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const {
		gameId: preselectedGameId,
		draftId: initialDraftId,
		rating: initialRating,
	} = Route.useSearch();
	const id = useId();

	// Game selection state
	const [selectedGame, setSelectedGame] = useState<{
		id: string;
		name: string;
		coverUrl: string | null;
	} | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Array<{
			_id: string;
			name: string;
			slug: string;
			coverUrl?: string;
			genres: string[];
			categoryLabel?: string;
		}>
	>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Form state
	const [title, setTitle] = useState("");
	const [content, setContent] = useState(""); // TipTap JSON string
	const [rating, setRating] = useState(initialRating ?? 0);
	const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
	const [coverFileKey, setCoverFileKey] = useState<string | null>(null);
	const [containsSpoilers, setContainsSpoilers] = useState(false);
	const [tags, setTags] = useState<string[]>([]);
	const [genres, setGenres] = useState<string[]>([]);
	const [igdbGenres, setIgdbGenres] = useState<string[]>([]);

	// Draft state
	const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [showDraftPicker, setShowDraftPicker] = useState(false);

	// Submission state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasPublished, setHasPublished] = useState(false);
	const [publishedReviewId, setPublishedReviewId] = useState<string | null>(
		null,
	);

	// Auto-save debounce ref
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const draftLoadedRef = useRef(false);

	// Track if there are unsaved changes (for navigation warning)
	const hasUnsavedChanges =
		!hasPublished &&
		(title.trim() !== "" || content.trim() !== "" || rating > 0);

	// Convex hooks
	const createReviewMut = useMutation(api.reviews.create);
	const saveReviewDraftMut = useMutation(api.drafts.saveReviewDraft);
	const deleteReviewDraftMut = useMutation(api.drafts.deleteReviewDraft);
	const searchAndCache = useAction(api.igdb.searchAndCache);

	// Load preselected game if gameId is provided
	const preselectedGameData = useQuery(
		api.games.getById,
		preselectedGameId ? { gameId: preselectedGameId as Id<"games"> } : "skip",
	);

	// Check for existing review on preselected game
	const existingReview = useQuery(
		api.reviews.getUserReviewForGame,
		user && preselectedGameId
			? { clerkId: user.id, gameId: preselectedGameId as Id<"games"> }
			: "skip",
	);

	// Load drafts from Convex
	const draftsData = useQuery(
		api.drafts.getReviewDrafts,
		user && !initialDraftId ? { clerkId: user.id } : "skip",
	);
	const availableDrafts = draftsData ?? [];

	// Show draft picker when drafts load (but not if we have a preselected game)
	useEffect(() => {
		if (
			availableDrafts.length > 0 &&
			!draftId &&
			!initialDraftId &&
			!preselectedGameId
		) {
			setShowDraftPicker(true);
		}
	}, [availableDrafts.length, draftId, initialDraftId, preselectedGameId]);

	// Set preselected game when data loads
	useEffect(() => {
		if (preselectedGameData && !selectedGame) {
			setSelectedGame({
				id: preselectedGameData._id,
				name: preselectedGameData.name,
				coverUrl: preselectedGameData.coverUrl ?? null,
			});
			if (preselectedGameData.genres) {
				const normalized = normalizeIgdbGenres(preselectedGameData.genres);
				setIgdbGenres(normalized);
				setGenres(normalized);
			}
		}
	}, [preselectedGameData, selectedGame]);

	// Load draft if draftId is provided
	const allDraftsForLoad = useQuery(
		api.drafts.getReviewDrafts,
		user && initialDraftId ? { clerkId: user.id } : "skip",
	);

	useEffect(() => {
		if (initialDraftId && allDraftsForLoad && !draftLoadedRef.current) {
			const draft = allDraftsForLoad.find((d) => d._id === initialDraftId);
			if (draft) {
				draftLoadedRef.current = true;
				setTitle(draft.title || "");
				setContent(draft.content || "");
				setRating(draft.rating || 0);
				setCoverImageUrl(draft.coverImageUrl ?? null);
				setCoverFileKey(draft.coverFileKey ?? null);
				setContainsSpoilers(draft.containsSpoilers ?? false);
				setTags(draft.tags ?? []);
				setGenres(draft.genres ?? []);
				setDraftId(draft._id);
				toast.success("Draft loaded");
			}
		}
	}, [initialDraftId, allDraftsForLoad]);

	// Auto-save function
	const autoSave = useCallback(async () => {
		if (!user || !title.trim()) return;

		setSaveStatus("saving");
		try {
			const result = await saveReviewDraftMut({
				draftId: draftId as Id<"reviewDrafts"> | undefined,
				title,
				content,
				rating: rating > 0 ? rating : undefined,
				coverImageUrl: coverImageUrl || undefined,
				coverFileKey: coverFileKey || undefined,
				containsSpoilers,
				tags: tags.length > 0 ? tags : undefined,
				genres: genres.length > 0 ? genres : undefined,
				gameId: selectedGame?.id,
				authorClerkId: user.id,
			});
			setDraftId(result);
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
		tags,
		genres,
		selectedGame,
		saveReviewDraftMut,
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
				const results = await searchAndCache({
					query: searchQuery,
					limit: 5,
				});
				setSearchResults(results);
			} catch (error) {
				console.error("Search failed:", error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery, searchAndCache]);

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

		// Cancel any pending auto-save
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		setIsSubmitting(true);
		try {
			// Extract mentions from TipTap content
			let mentions: MentionData[] | undefined;
			try {
				const parsed = JSON.parse(content);
				mentions = extractMentionsFromTipTap(parsed);
			} catch {
				// Not JSON content, no mentions
			}

			const reviewId = await createReviewMut({
				title,
				content,
				rating,
				gameId: selectedGame.id as Id<"games">,
				coverImageUrl: coverImageUrl || undefined,
				coverFileKey: coverFileKey || undefined,
				containsSpoilers,
				tags: tags.length > 0 ? tags : undefined,
				genres: genres.length > 0 ? genres : undefined,
				published: true,
				authorClerkId: user.id,
				mentions: mentions && mentions.length > 0 ? mentions : undefined,
			});

			// Delete the draft if it exists
			if (draftId) {
				await deleteReviewDraftMut({
					draftId: draftId as Id<"reviewDrafts">,
					clerkId: user.id,
					preserveImages: true,
				});
			}

			setHasPublished(true);
			setPublishedReviewId(reviewId);
		} catch (error) {
			console.error("Failed to create review:", error);
			toast.error(
				"Failed to create review. You may have already reviewed this game.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle successful publish navigation
	useEffect(() => {
		if (hasPublished && publishedReviewId) {
			navigate({ to: "/reviews/$id", params: { id: publishedReviewId } });
		}
	}, [hasPublished, publishedReviewId, navigate]);

	const handleDraftSelect = (selectedDraftId: string) => {
		navigate({
			to: "/reviews/new",
			search: { gameId: undefined, draftId: selectedDraftId },
		});
		setShowDraftPicker(false);
	};

	const handleStartFresh = () => {
		setShowDraftPicker(false);
	};

	const handleDeleteDraftOnLeave = async () => {
		if (draftId && user) {
			await deleteReviewDraftMut({
				draftId: draftId as Id<"reviewDrafts">,
				clerkId: user.id,
			});
		}
	};

	const handleImageError = (
		e: React.SyntheticEvent<HTMLImageElement, Event>,
	) => {
		e.currentTarget.style.display = "none";
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Sign in to write a review
					</h1>
					<Link to="/sign-in" className="text-slate-400 hover:underline">
						Sign In
					</Link>
				</div>
			</div>
		);
	}

	// Show redirect if user already has a review for this game
	if (existingReview && preselectedGameData) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center p-4">
				<div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-6 text-center">
					<div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center">
						<FileText className="text-yellow-400" size={32} />
					</div>
					<h2 className="text-xl font-semibold text-white mb-2">
						You already reviewed this game
					</h2>
					<p className="text-gray-400 mb-6">
						You can only have one review per game. Would you like to edit your
						existing review for {preselectedGameData.name}?
					</p>
					<div className="flex gap-3 justify-center">
						<Link
							to="/"
							className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
						>
							Go Back
						</Link>
						<Link
							to="/reviews/edit/$id"
							params={{ id: existingReview._id }}
							className="px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-medium rounded-lg transition-all"
						>
							Edit Review
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Draft picker modal
	if (showDraftPicker && availableDrafts.length > 0) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center p-4">
				<div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-6">
					<div className="flex items-center gap-3 mb-6">
						<FileText className="text-slate-400" size={24} />
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
								key={draft._id}
								type="button"
								onClick={() => handleDraftSelect(draft._id)}
								className="w-full p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-left transition-colors"
							>
								<p className="text-white font-medium truncate">
									{draft.title || "Untitled Review"}
								</p>
								<p className="text-sm text-gray-500">
									{draft.rating
										? `${draft.rating}/5 - ${getRatingLabel(draft.rating)} • `
										: ""}
									Last edited{" "}
									{new Date(
										draft.updatedAt ?? draft._creationTime,
									).toLocaleDateString()}
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
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20">
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
									className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-slate-500"
								/>
							</div>

							{/* Search Results */}
							{searchResults.length > 0 && (
								<div className="mt-4 space-y-2">
									{searchResults.map((game) => (
										<button
											key={game._id}
											type="button"
											onClick={() => {
												const normalized = normalizeIgdbGenres(game.genres);
												setSelectedGame({
													id: game._id,
													name: game.name,
													coverUrl: game.coverUrl ?? null,
												});
												setIgdbGenres(normalized);
												setGenres(normalized);
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
													crossOrigin="anonymous"
													onError={handleImageError}
												/>
											) : (
												<Gamepad2 className="w-10 h-14 text-gray-500" />
											)}
											<span className="text-white font-medium">
												{game.name}
											</span>
											{game.categoryLabel && (
												<span className="px-1.5 py-0.5 bg-slate-600/80 rounded text-xs font-medium text-white">
													{game.categoryLabel}
												</span>
											)}
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
									crossOrigin="anonymous"
									onError={handleImageError}
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
							showLabel
						/>
					</div>

					{/* Tags */}
					<TagSelector selectedTags={tags} onChange={setTags} />

					{/* Genres */}
					<GenreSelector
						selectedGenres={genres}
						onChange={setGenres}
						igdbGenres={igdbGenres}
					/>

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
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-slate-500"
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
						className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? "Publishing..." : "Publish Review"}
					</button>
				</form>
			</div>
		</div>
	);
}
