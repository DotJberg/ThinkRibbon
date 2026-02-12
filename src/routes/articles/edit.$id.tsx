import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Cloud, Gamepad2, Save, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CoverImageUpload } from "../../components/editor/CoverImageUpload";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { GenreSelector } from "../../components/shared/GenreSelector";
import { SpoilerToggle } from "../../components/shared/SpoilerWarning";
import { TagSelector } from "../../components/shared/TagSelector";
import { normalizeIgdbGenres } from "../../lib/genres";
import {
	extractMentionsFromTipTap,
	type MentionData,
} from "../../lib/mentions";

export const Route = createFileRoute("/articles/edit/$id")({
	component: EditArticlePage,
});

function EditArticlePage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const formId = useId();

	// Form state
	const [title, setTitle] = useState("");
	const [content, setContent] = useState(""); // TipTap JSON string or plain text
	const [excerpt, setExcerpt] = useState("");
	const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
	const [coverFileKey, setCoverFileKey] = useState<string | null>(null);
	const [containsSpoilers, setContainsSpoilers] = useState(false);
	const [tags, setTags] = useState<string[]>([]);
	const [genres, setGenres] = useState<string[]>([]);
	const [selectedGames, setSelectedGames] = useState<
		Array<{
			id: string;
			name: string;
			coverUrl: string | null;
			genres: string[];
		}>
	>([]);

	// Search state
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

	// Loading state
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Auto-save debounce ref
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const initialLoadRef = useRef(true);

	// Convex hooks
	const article = useQuery(api.articles.getById, {
		articleId: id as Id<"articles">,
	});
	const updateArticleMut = useMutation(api.articles.update);
	const searchAndCache = useAction(api.igdb.searchAndCache);

	const isLoading = article === undefined;

	// Populate form state from query data on first load
	useEffect(() => {
		if (article && initialLoadRef.current) {
			setTitle(article.title);
			setContent(article.content);
			setExcerpt(article.excerpt || "");
			setCoverImageUrl(article.coverImageUrl ?? null);
			setContainsSpoilers(article.containsSpoilers || false);
			setTags(article.tags ?? []);
			if (article.games) {
				const gamesWithGenres = article.games
					.filter((g) => g !== null)
					.map((g) => ({
						id: g._id,
						name: g.name,
						coverUrl: g.coverUrl ?? null,
						genres: (g as { genres?: string[] }).genres ?? [],
					}));
				setSelectedGames(gamesWithGenres);
				if (article.genres && article.genres.length > 0) {
					setGenres(article.genres);
				} else {
					setGenres(
						normalizeIgdbGenres(gamesWithGenres.flatMap((g) => g.genres)),
					);
				}
			} else {
				setGenres(article.genres ?? []);
			}
			// Mark initial load complete after a short delay
			setTimeout(() => {
				initialLoadRef.current = false;
			}, 100);
		}
	}, [article]);

	// Auto-save function
	const autoSave = useCallback(async () => {
		if (!user || !title.trim() || initialLoadRef.current) return;

		setSaveStatus("saving");
		try {
			await updateArticleMut({
				articleId: id as Id<"articles">,
				title,
				content,
				excerpt: excerpt || undefined,
				coverImageUrl: coverImageUrl || undefined,
				coverFileKey: coverFileKey || undefined,
				containsSpoilers,
				tags,
				genres,
				gameIds: selectedGames.map((g) => g.id as Id<"games">),
				clerkId: user.id,
			});
			setLastSaved(new Date());
			setSaveStatus("saved");
		} catch (error) {
			console.error("Auto-save failed:", error);
			setSaveStatus("idle");
		}
	}, [
		user,
		id,
		title,
		content,
		excerpt,
		coverImageUrl,
		coverFileKey,
		containsSpoilers,
		tags,
		genres,
		selectedGames,
		updateArticleMut,
	]);

	// Debounced auto-save on content changes
	useEffect(() => {
		if (!title.trim() || initialLoadRef.current) return;

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
				setSearchResults(
					results.filter((g) => !selectedGames.some((sg) => sg.id === g._id)),
				);
			} catch (error) {
				console.error("Search failed:", error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery, selectedGames, searchAndCache]);

	const handleAddGame = (game: {
		id: string;
		name: string;
		coverUrl: string | null;
		genres: string[];
	}) => {
		setSelectedGames((prev) => [...prev, game]);
		const normalized = normalizeIgdbGenres(game.genres);
		setGenres((prev) => [...new Set([...prev, ...normalized])]);
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

			await updateArticleMut({
				articleId: id as Id<"articles">,
				title,
				content,
				excerpt: excerpt || undefined,
				coverImageUrl: coverImageUrl || undefined,
				coverFileKey: coverFileKey || undefined,
				containsSpoilers,
				tags,
				genres,
				gameIds: selectedGames.map((g) => g.id as Id<"games">),
				published: true,
				saveHistory: true,
				clerkId: user.id,
				mentions: mentions && mentions.length > 0 ? mentions : undefined,
			});

			toast.success("Article updated");
			navigate({ to: "/articles/$id", params: { id } });
		} catch (error) {
			console.error("Failed to update article:", error);
			toast.error("Failed to update article");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Sign in to edit this article
					</h1>
					<Link to="/sign-in" className="text-slate-400 hover:underline">
						Sign In
					</Link>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20">
			<Toaster position="top-right" theme="dark" />

			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="flex items-center justify-between mb-6">
					<Link
						to="/articles/$id"
						params={{ id }}
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
					>
						<ArrowLeft size={20} />
						Back to Article
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

				<h1 className="text-3xl font-bold text-white mb-8">Edit Article</h1>

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
							htmlFor={`${formId}-title`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Title
						</label>
						<input
							id={`${formId}-title`}
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Give your article a title..."
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-slate-500 text-xl"
							required
						/>
					</div>

					{/* Excerpt */}
					<div>
						<label
							htmlFor={`${formId}-excerpt`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Excerpt (optional)
						</label>
						<textarea
							id={`${formId}-excerpt`}
							value={excerpt}
							onChange={(e) => setExcerpt(e.target.value)}
							placeholder="A brief summary for previews..."
							rows={2}
							maxLength={500}
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-slate-500 resize-none"
						/>
					</div>

					{/* Game Tags */}
					<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
						<label
							htmlFor={`${formId}-game-search`}
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
										className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700/20 border border-slate-500/30 rounded-full text-sm"
									>
										{game.coverUrl && (
											<img
												src={game.coverUrl}
												alt=""
												className="w-4 h-4 rounded object-cover"
											/>
										)}
										<span className="text-slate-300">{game.name}</span>
										<button
											type="button"
											onClick={() => handleRemoveGame(game.id)}
											className="text-slate-400 hover:text-slate-100"
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
								id={`${formId}-game-search`}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search games to tag..."
								className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-slate-500 text-sm"
							/>
						</div>

						{/* Search Results */}
						{searchResults.length > 0 && (
							<div className="mt-2 space-y-1">
								{searchResults.map((game) => (
									<button
										key={game._id}
										type="button"
										onClick={() =>
											handleAddGame({
												id: game._id,
												name: game.name,
												coverUrl: game.coverUrl ?? null,
												genres: game.genres,
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

					{/* Tags */}
					<TagSelector selectedTags={tags} onChange={setTags} />

					{/* Genres */}
					<GenreSelector
						selectedGenres={genres}
						onChange={setGenres}
						igdbGenres={normalizeIgdbGenres(
							selectedGames.flatMap((g) => g.genres),
						)}
					/>

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

					<div className="flex gap-4">
						<Link
							to="/articles/$id"
							params={{ id }}
							className="flex-1 py-3 text-center bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
						>
							Cancel
						</Link>
						<button
							type="submit"
							disabled={isSubmitting || !title.trim() || !content.trim()}
							className="flex-1 py-3 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
