import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "../../lib/utils";
import { LikeButton } from "../shared/LikeButton";
import { SafeImage } from "../shared/SafeImage";
import { PostImageGrid } from "./PostImageGrid";

interface PostCardProps {
	post: {
		id: string;
		content: string;
		createdAt: Date | string;
		author: {
			id: string;
			username: string;
			displayName: string | null;
			avatarUrl: string | null;
		};
		images?: Array<{ url: string; caption?: string }>;
		_count: {
			likes: number;
			comments: number;
		};
	};
	onLike?: () => Promise<{ liked: boolean }>;
	initialLiked?: boolean;
	isAuthenticated?: boolean;
}

export function PostCard({
	post,
	onLike,
	initialLiked,
	isAuthenticated,
}: PostCardProps) {
	const createdAt =
		typeof post.createdAt === "string"
			? new Date(post.createdAt)
			: post.createdAt;

	return (
		<article className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-colors">
			<div className="flex gap-3">
				{/* Avatar */}
				<Link
					to="/profile/$username"
					params={{ username: post.author.username }}
				>
					<div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center overflow-hidden flex-shrink-0">
						<SafeImage
							src={post.author.avatarUrl || undefined}
							alt={post.author.username}
							className="w-full h-full object-cover"
							fallback={
								<span className="text-white font-bold text-sm">
									{(post.author.displayName ||
										post.author.username)[0].toUpperCase()}
								</span>
							}
						/>
					</div>
				</Link>

				<div className="flex-1 min-w-0">
					{/* Header */}
					<div className="flex items-center gap-2 text-sm">
						<Link
							to="/profile/$username"
							params={{ username: post.author.username }}
							className="font-semibold text-white hover:underline truncate"
						>
							{post.author.displayName || post.author.username}
						</Link>
						<span className="text-gray-500">@{post.author.username}</span>
						<span className="text-gray-600">·</span>
						<span className="text-gray-500">
							{formatDistanceToNow(createdAt)}
						</span>
					</div>

					{/* Content */}
					<p className="text-gray-200 mt-1 whitespace-pre-wrap break-words">
						{post.content}
					</p>

					{post.images && post.images.length > 0 && (
						<PostImageGrid images={post.images} />
					)}

					{/* Actions */}
					<div className="flex items-center gap-4 mt-3">
						<LikeButton
							likeCount={post._count.likes}
							initialLiked={initialLiked}
							onToggle={onLike || (async () => ({ liked: false }))}
							disabled={!isAuthenticated || !onLike}
						/>
						<button
							type="button"
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors"
						>
							<MessageCircle size={16} />
							<span>{post._count.comments}</span>
						</button>
					</div>
				</div>
			</div>
		</article>
	);
}
