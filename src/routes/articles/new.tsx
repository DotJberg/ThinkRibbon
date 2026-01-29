import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Cloud,
	FileText,
	Gamepad2,
	Save,
	Search,
	X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { CoverImageUpload } from "../../components/editor/CoverImageUpload";
import { NavigationWarning } from "../../components/editor/NavigationWarning";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { SpoilerToggle } from "../../components/shared/SpoilerWarning";
import { createArticle } from "../../lib/server/articles";
import {
	deleteArticleDraft,
	getArticleDrafts,
	saveArticleDraft,
} from "../../lib/server/drafts";
import { searchGames } from "../../lib/server/games";

export const Route = createFileRoute("/articles/new")({
	component: NewArticlePage,
	validateSearch: (search: Record<string, unknown>) => ({
		draftId: search.draftId as string | undefined,
	}),
});

function NewArticlePage() {
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const { draftId: initialDraftId } = Route.useSearch();
	const id = useId();

	// Form state
	const [title, setTitle] = useState("");
	const [content, setContent] = useState(""); // TipTap JSON string
	const [excerpt, setExcerpt] = useState("");
	const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
	const [coverFileKey, setCoverFileKey] = useState<string | null>(null);
	const [containsSpoilers, setContainsSpoilers] = useState(false);
	const [selectedGames, setSelectedGames] = useState<
		Array<{ id: string; name: string; coverUrl: string | null }>
	>([]);

	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Awaited<ReturnType<typeof searchGames>>
	>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Draft state
	const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [showDraftPicker, setShowDraftPicker] = useState(false);
	const [availableDrafts, setAvailableDrafts] = useState<
		Awaited<ReturnType<typeof getArticleDrafts>>
	>([]);

	// Submission state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasPublished, setHasPublished] = useState(false);
	const [publishedArticleId, setPublishedArticleId] = useState<string | null>(
		null,
	);

	// Auto-save debounce ref
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Track if there are unsaved changes (for navigation warning)
	const hasUnsavedChanges =
		!hasPublished && (title.trim() !== "" || content.trim() !== "");

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
			getArticleDrafts({ data: user.id }).then((drafts) => {
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
			const drafts = await getArticleDrafts({ data: user.id });
			const draft = drafts.find((d) => d.id === id);
			if (draft) {
				setTitle(draft.title || "");
				setContent(draft.content || "");
				setExcerpt(draft.excerpt || "");
				setCoverImageUrl(draft.coverImageUrl);
				setCoverFileKey(draft.coverFileKey);
				setContainsSpoilers(draft.containsSpoilers);
				setDraftId(draft.id);
				// Note: Game selection from draft.gameIds would need additional logic to fetch game details
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
			const result = await saveArticleDraft({
				data: {
					draftId,
					title,
					content,
					excerpt: excerpt || undefined,
					coverImageUrl: coverImageUrl || undefined,
					coverFileKey: coverFileKey || undefined,
					containsSpoilers,
					gameIds: selectedGames.map((g) => g.id),
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
		excerpt,
		coverImageUrl,
		coverFileKey,
		containsSpoilers,
		selectedGames,
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
				setSearchResults(
					results.filter((g) => !selectedGames.some((sg) => sg.id === g.id)),
				);
			} catch (error) {
				console.error("Search failed:", error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery, selectedGames]);

	const handleAddGame = (game: {
		id: string;
		name: string;
		coverUrl: string | null;
	}) => {
		setSelectedGames((prev) => [...prev, game]);
		setSearchQuery("");
		setSearchResults([]);
	};

	const handleRemoveGame = (gameId: string) => {
		setSelectedGames((prev) => prev.filter((g) => g.id !== gameId));
	};

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
		if (!user || !title.trim() || !content.trim()) return;

		// Cancel any pending auto-save
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		setIsSubmitting(true);
		try {
			const article = await createArticle({
				data: {
					title,
					content, // This is now JSON string from TipTap
					excerpt: excerpt || undefined,
					coverImageUrl: coverImageUrl || undefined,
					coverFileKey: coverFileKey || undefined,
					containsSpoilers,
					gameIds: selectedGames.map((g) => g.id),
					published: true,
					authorClerkId: user.id,
				},
			});

			// Delete the draft if it exists
			if (draftId) {
				await deleteArticleDraft({
					data: { draftId, clerkId: user.id, preserveImages: true },
				});
			}

			setHasPublished(true);
			setPublishedArticleId(article.id);
		} catch (error) {
			console.error("Failed to create article:", error);
			toast.error("Failed to publish article");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle successful publish navigation
	useEffect(() => {
		if (hasPublished && publishedArticleId) {
			navigate({ to: "/articles/$id", params: { id: publishedArticleId } });
		}
	}, [hasPublished, publishedArticleId, navigate]);

	const handleDraftSelect = (selectedDraftId: string) => {
		loadDraft(selectedDraftId);
		setShowDraftPicker(false);
	};

	const handleStartFresh = () => {
		setShowDraftPicker(false);
	};

	const handleDeleteDraftOnLeave = async () => {
		if (draftId && user) {
			await deleteArticleDraft({ data: { draftId, clerkId: user.id } });
		}
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Sign in to write an article
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
						You have {availableDrafts.length} saved draft
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
									{draft.title || "Untitled Draft"}
								</p>
								<p className="text-sm text-gray-500">
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
					<h1 className="text-3xl font-bold text-white">Write an Article</h1>
					<Link
						to="/drafts"
						className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white text-sm font-medium"
					>
						<FileText size={16} />
						My Drafts
					</Link>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Cover Image */}
					<CoverImageUpload
						currentUrl={coverImageUrl}
						onUpload={handleCoverUpload}
						onRemove={handleCoverRemove}
						uploadEndpoint="articleCover"
					/>

					{/* Title */}
					<div>
						<label
							htmlFor={`${id}-title`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Title
						</label>
						<input
							id={`${id}-title`}
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Give your article a title..."
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 text-xl"
							required
						/>
					</div>

					{/* Excerpt */}
					<div>
						<label
							htmlFor={`${id}-excerpt`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Excerpt (optional)
						</label>
						<textarea
							id={`${id}-excerpt`}
							value={excerpt}
							onChange={(e) => setExcerpt(e.target.value)}
							placeholder="A brief summary for previews..."
							rows={2}
							maxLength={500}
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 resize-none"
						/>
					</div>

					{/* Game Tags */}
					<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
						<label
							htmlFor={`${id}-game-search`}
							className="block text-sm font-medium text-gray-300 mb-3"
						>
							Related Games (optional)
						</label>

						{/* Selected Games */}
						{selectedGames.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-3">
								{selectedGames.map((game) => (
									<span
										key={game.id}
										className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-full text-sm"
									>
										{game.coverUrl && (
											<img
												src={game.coverUrl}
												alt=""
												className="w-4 h-4 rounded object-cover"
											/>
										)}
										<span className="text-purple-300">{game.name}</span>
										<button
											type="button"
											onClick={() => handleRemoveGame(game.id)}
											className="text-purple-400 hover:text-purple-200"
										>
											<X size={14} />
										</button>
									</span>
								))}
							</div>
						)}

						{/* Search */}
						<div className="relative">
							<Search
								className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${isSearching ? "animate-pulse" : ""}`}
								size={18}
							/>
							<input
								id={`${id}-game-search`}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search games to tag..."
								className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 text-sm"
							/>
						</div>

						{/* Search Results */}
						{searchResults.length > 0 && (
							<div className="mt-2 space-y-1">
								{searchResults.map((game) => (
									<button
										key={game.id}
										type="button"
										onClick={() =>
											handleAddGame({
												id: game.id,
												name: game.name,
												coverUrl: game.coverUrl,
											})
										}
										className="w-full flex items-center gap-2 p-2 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors text-left text-sm"
									>
										{game.coverUrl ? (
											<img
												src={game.coverUrl}
												alt=""
												className="w-6 h-8 object-cover rounded"
											/>
										) : (
											<Gamepad2 className="w-6 h-8 text-gray-500" />
										)}
										<span className="text-white">{game.name}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Spoiler Toggle */}
					<SpoilerToggle
						checked={containsSpoilers}
						onChange={setContainsSpoilers}
					/>

					{/* Content - Rich Text Editor */}
					<div>
						<span className="block text-sm font-medium text-gray-300 mb-2">
							Content
						</span>
						<RichTextEditor
							content={content}
							onChange={setContent}
							placeholder="Write your article..."
							uploadEndpoint="articleInlineImage"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || !title.trim() || !content.trim()}
						className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? "Publishing..." : "Publish Article"}
					</button>
				</form>
			</div>
		</div>
	);
}
