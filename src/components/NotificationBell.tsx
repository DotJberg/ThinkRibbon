import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

function formatTimeAgo(timestamp: number): string {
	const now = Date.now();
	const diffInSeconds = Math.floor((now - timestamp) / 1000);
	if (diffInSeconds < 60) return "just now";
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) return `${diffInHours}h ago`;
	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) return `${diffInDays}d ago`;
	return new Date(timestamp).toLocaleDateString();
}

const notificationMessages: Record<string, string> = {
	like_post: "liked your post",
	like_article: "liked your article",
	like_review: "liked your review",
	like_comment: "liked your comment",
	comment_post: "commented on your post",
	comment_article: "commented on your article",
	comment_review: "commented on your review",
	reply_comment: "replied to your comment",
	mention_post: "mentioned you in a post",
	mention_article: "mentioned you in an article",
	mention_review: "mentioned you in a review",
};

const contentRoutes: Record<string, string> = {
	post: "/posts/$id",
	article: "/articles/$id",
	review: "/reviews/$id",
};

function getNotificationLink(
	type: string,
	targetId: string,
	commentId?: string,
	contentType?: string,
	contentId?: string,
): { to: string; params: Record<string, string>; hash?: string } {
	// Comment on content — navigate to content page, scroll to the comment
	if (
		type === "comment_post" ||
		type === "comment_article" ||
		type === "comment_review"
	) {
		const suffix = type.split("_")[1]; // "post" | "article" | "review"
		return {
			to: contentRoutes[suffix],
			params: { id: targetId },
			...(commentId && { hash: `comment-${commentId}` }),
		};
	}

	// Like on content — navigate to content page (no comment to scroll to)
	if (type === "like_post" || type === "mention_post") {
		return { to: "/posts/$id", params: { id: targetId } };
	}
	if (type === "like_article" || type === "mention_article") {
		return { to: "/articles/$id", params: { id: targetId } };
	}
	if (type === "like_review" || type === "mention_review") {
		return { to: "/reviews/$id", params: { id: targetId } };
	}

	// reply_comment / like_comment — resolve via enriched contentType/contentId
	if (
		(type === "reply_comment" || type === "like_comment") &&
		contentType &&
		contentId
	) {
		const route = contentRoutes[contentType];
		if (route) {
			// For like_comment, targetId IS the comment; for reply_comment, commentId is the reply
			const scrollTo = commentId || targetId;
			return {
				to: route,
				params: { id: contentId },
				hash: `comment-${scrollTo}`,
			};
		}
	}

	return { to: "/", params: {} };
}

export default function NotificationBell() {
	const { user } = useUser();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const unreadCount = useQuery(
		api.notifications.getUnreadCount,
		user?.id ? { clerkId: user.id } : "skip",
	);

	const notifications = useQuery(
		api.notifications.getAll,
		user?.id && isOpen ? { clerkId: user.id } : "skip",
	);

	const markAllViewed = useMutation(api.notifications.markAllViewed);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleOpen = () => {
		const opening = !isOpen;
		setIsOpen(opening);
		if (opening && user?.id && unreadCount && unreadCount > 0) {
			markAllViewed({ clerkId: user.id });
		}
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				onClick={handleOpen}
				className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
				aria-label="Notifications"
			>
				<Bell size={20} />
				{unreadCount != null && unreadCount > 0 && (
					<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
				)}
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
					<div className="px-4 py-3 border-b border-gray-700">
						<span className="font-semibold text-sm text-white">
							Notifications
						</span>
					</div>
					<div className="max-h-96 overflow-y-auto">
						{notifications && notifications.length > 0 ? (
							notifications.map((n) => {
								const link = getNotificationLink(
									n.type,
									n.targetId,
									n.commentId ?? undefined,
									n.contentType ?? undefined,
									n.contentId ?? undefined,
								);
								return (
									<Link
										key={n._id}
										to={link.to}
										params={link.params}
										hash={link.hash}
										onClick={() => setIsOpen(false)}
										className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
											!n.viewedAt ? "bg-gray-750" : ""
										}`}
									>
										<div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-500 flex-shrink-0">
											{n.actor?.avatarUrl ? (
												<img
													src={n.actor.avatarUrl}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
													{(n.actor?.displayName ||
														n.actor?.username ||
														"?")[0].toUpperCase()}
												</span>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-gray-200">
												<span className="font-semibold text-white">
													{n.actor?.displayName || n.actor?.username}
												</span>{" "}
												{notificationMessages[n.type] ||
													"interacted with your content"}
											</p>
											<p className="text-xs text-gray-400 mt-0.5">
												{formatTimeAgo(n._creationTime)}
											</p>
										</div>
										{!n.viewedAt && (
											<span className="w-2 h-2 bg-slate-600 rounded-full flex-shrink-0 mt-2" />
										)}
									</Link>
								);
							})
						) : (
							<div className="px-4 py-8 text-center text-gray-400 text-sm">
								No notifications
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
