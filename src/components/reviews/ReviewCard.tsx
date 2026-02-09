import { Link } from "@tanstack/react-router";
import { Calendar, Gamepad2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "../../lib/utils";
import { LikeButton } from "../shared/LikeButton";
import { SpoilerBadge } from "../shared/SpoilerWarning";
import { StarRating } from "../shared/StarRating";
import { TagDisplay } from "../shared/TagDisplay";

interface ReviewCardProps {
	review: {
		id: string;
		title: string;
		content: string;
		rating: number;
		coverImageUrl?: string | null;
		containsSpoilers?: boolean;
		tags?: string[];
		genres?: string[];
		createdAt: Date | string;
		author: {
			id: string;
			username: string;
			displayName: string | null;
			avatarUrl: string | null;
		};
		game: {
			id: string;
			name: string;
			slug: string;
			coverUrl: string | null;
		};
		_count: {
			likes: number;
			comments: number;
		};
	};
	onLike?: () => Promise<{ liked: boolean }>;
	initialLiked?: boolean;
	isAuthenticated?: boolean;
}

export function ReviewCard({
	review,
	onLike,
	initialLiked,
	isAuthenticated,
}: ReviewCardProps) {
	const createdAt =
		typeof review.createdAt === "string"
			? new Date(review.createdAt)
			: review.createdAt;

	return (
		<article className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600/50 transition-colors group">
			{/* Cover Image (if uploaded by user) */}
			{review.coverImageUrl && (
				<Link to="/reviews/$id" params={{ id: review.id }}>
					<div className="aspect-video bg-gray-700 overflow-hidden">
						<img
							src={review.coverImageUrl}
							alt={review.title}
							loading="lazy"
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					</div>
				</Link>
			)}

			<div className="flex">
				{/* Game Cover */}
				<Link
					to="/games/$slug"
					params={{ slug: review.game.slug }}
					className="flex-shrink-0"
				>
					<div className="w-20 h-28 sm:w-24 sm:h-32 bg-gray-700 overflow-hidden">
						{review.game.coverUrl ? (
							<img
								src={review.game.coverUrl}
								alt={review.game.name}
								loading="lazy"
								className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<Gamepad2 className="w-8 h-8 text-gray-500" />
							</div>
						)}
					</div>
				</Link>

				<div className="flex-1 p-4 min-w-0">
					{/* Header */}
					<div className="flex items-start justify-between gap-2 mb-2">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<Link
									to="/reviews/$id"
									params={{ id: review.id }}
									className="text-lg font-bold text-white hover:text-slate-400 transition-colors line-clamp-1"
								>
									{review.title}
								</Link>
								{review.containsSpoilers && (
									<SpoilerBadge className="flex-shrink-0" />
								)}
							</div>
							<Link
								to="/games/$slug"
								params={{ slug: review.game.slug }}
								className="text-sm text-gray-400 hover:text-gray-300 transition-colors line-clamp-1"
							>
								{review.game.name}
							</Link>
						</div>
						<StarRating rating={review.rating} size="sm" />
					</div>

					{/* Tags */}
					{(review.tags?.length || review.genres?.length) && (
						<div className="mb-2">
							<TagDisplay tags={review.tags} genres={review.genres} />
						</div>
					)}

					{/* Footer */}
					<div className="flex items-center justify-between mt-auto">
						<div className="flex items-center gap-2">
							<Link
								to="/profile/$username"
								params={{ username: review.author.username }}
							>
								<div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden">
									{review.author.avatarUrl ? (
										<img
											src={review.author.avatarUrl}
											alt=""
											loading="lazy"
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
											{(review.author.displayName ||
												review.author.username)[0].toUpperCase()}
										</span>
									)}
								</div>
							</Link>
							<Link
								to="/profile/$username"
								params={{ username: review.author.username }}
								className="text-sm text-gray-400 hover:text-white transition-colors"
							>
								{review.author.displayName || review.author.username}
							</Link>
							<span className="text-gray-600 text-sm flex items-center gap-1">
								<Calendar size={12} />
								{formatDistanceToNow(createdAt)}
							</span>
						</div>

						<div className="flex items-center gap-2">
							<LikeButton
								likeCount={review._count.likes}
								initialLiked={initialLiked}
								onToggle={onLike || (async () => ({ liked: false }))}
								disabled={!isAuthenticated || !onLike}
							/>
							<span className="flex items-center gap-1 text-sm text-gray-400">
								<MessageCircle size={14} />
								{review._count.comments}
							</span>
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}
