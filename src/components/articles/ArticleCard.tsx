import { Link } from "@tanstack/react-router";
import { Calendar, Gamepad2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "../../lib/utils";
import { LikeButton } from "../shared/LikeButton";
import { SpoilerBadge } from "../shared/SpoilerWarning";

interface ArticleCardProps {
	article: {
		id: string;
		title: string;
		excerpt: string | null;
		content: string;
		coverImageUrl: string | null;
		containsSpoilers?: boolean;
		createdAt: Date | string;
		author: {
			id: string;
			username: string;
			displayName: string | null;
			avatarUrl: string | null;
		};
		games: Array<{
			game: {
				id: string;
				name: string;
				slug: string;
				coverUrl: string | null;
			};
		}>;
		_count: {
			likes: number;
			comments: number;
		};
	};
	onLike?: () => Promise<{ liked: boolean }>;
	initialLiked?: boolean;
	isAuthenticated?: boolean;
}

export function ArticleCard({
	article,
	onLike,
	initialLiked,
	isAuthenticated,
}: ArticleCardProps) {
	const createdAt =
		typeof article.createdAt === "string"
			? new Date(article.createdAt)
			: article.createdAt;

	// Only use excerpt field, don't slice content (might be JSON)
	const excerpt = article.excerpt;

	return (
		<article className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600/50 transition-colors group">
			{/* Cover Image */}
			{article.coverImageUrl && (
				<Link to="/articles/$id" params={{ id: article.id }}>
					<div className="aspect-video bg-gray-700 overflow-hidden">
						<img
							src={article.coverImageUrl}
							alt={article.title}
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					</div>
				</Link>
			)}

			<div className="p-4">
				{/* Title & Excerpt */}
				<div className="flex items-start gap-2 mb-2">
					<Link
						to="/articles/$id"
						params={{ id: article.id }}
						className="block flex-1"
					>
						<h3 className="text-xl font-bold text-white hover:text-purple-400 transition-colors line-clamp-2">
							{article.title}
						</h3>
					</Link>
					{article.containsSpoilers && <SpoilerBadge />}
				</div>
				{excerpt && (
					<p className="text-gray-400 text-sm line-clamp-2 mb-3">{excerpt}</p>
				)}

				{/* Games */}
				{article.games.length > 0 && (
					<div className="flex flex-wrap gap-2 mb-3">
						{article.games.slice(0, 3).map(({ game }) => (
							<Link
								key={game.id}
								to="/games/$slug"
								params={{ slug: game.slug }}
								className="flex items-center gap-1.5 px-2 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300 hover:bg-gray-700 transition-colors"
							>
								{game.coverUrl ? (
									<img
										src={game.coverUrl}
										alt=""
										className="w-4 h-4 rounded object-cover"
									/>
								) : (
									<Gamepad2 size={12} />
								)}
								{game.name}
							</Link>
						))}
						{article.games.length > 3 && (
							<span className="px-2 py-1 text-xs text-gray-500">
								+{article.games.length - 3} more
							</span>
						)}
					</div>
				)}

				{/* Footer */}
				<div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
					<div className="flex items-center gap-2">
						<Link
							to="/profile/$username"
							params={{ username: article.author.username }}
						>
							<div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
								{article.author.avatarUrl ? (
									<img
										src={article.author.avatarUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
										{(article.author.displayName ||
											article.author.username)[0].toUpperCase()}
									</span>
								)}
							</div>
						</Link>
						<Link
							to="/profile/$username"
							params={{ username: article.author.username }}
							className="text-sm text-gray-400 hover:text-white transition-colors"
						>
							{article.author.displayName || article.author.username}
						</Link>
						<span className="text-gray-600 text-sm flex items-center gap-1">
							<Calendar size={12} />
							{formatDistanceToNow(createdAt)}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<LikeButton
							likeCount={article._count.likes}
							initialLiked={initialLiked}
							onToggle={onLike || (async () => ({ liked: false }))}
							disabled={!isAuthenticated || !onLike}
						/>
						<span className="flex items-center gap-1 text-sm text-gray-400">
							<MessageCircle size={14} />
							{article._count.comments}
						</span>
					</div>
				</div>
			</div>
		</article>
	);
}
