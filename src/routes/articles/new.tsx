import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gamepad2, Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createArticle } from "../../lib/server/articles";
import { searchGames } from "../../lib/server/games";

export const Route = createFileRoute("/articles/new")({
	component: NewArticlePage,
});

function NewArticlePage() {
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const id = useId();

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [selectedGames, setSelectedGames] = useState<
		Array<{ id: string; name: string; coverUrl: string | null }>
	>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<
		Awaited<ReturnType<typeof searchGames>>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

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
				// Filter out already selected games
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !title.trim() || !content.trim()) return;

		setIsSubmitting(true);
		try {
			const article = await createArticle({
				data: {
					title,
					content,
					excerpt: excerpt || undefined,
					gameIds: selectedGames.map((g) => g.id),
					published: true,
					authorClerkId: user.id,
				},
			});
			navigate({ to: "/articles/$id", params: { id: article.id } });
		} catch (error) {
			console.error("Failed to create article:", error);
		} finally {
			setIsSubmitting(false);
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8 max-w-3xl">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					Back
				</Link>

				<h1 className="text-3xl font-bold text-white mb-8">Write an Article</h1>

				<form onSubmit={handleSubmit} className="space-y-6">
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

					{/* Content */}
					<div>
						<label
							htmlFor={`${id}-content`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Content
						</label>
						<textarea
							id={`${id}-content`}
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Write your article..."
							rows={15}
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 resize-none"
							required
						/>
						<p className="text-xs text-gray-500 mt-1">
							Markdown formatting is supported
						</p>
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
