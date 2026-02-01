import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	Edit,
	FileText,
	UserMinus,
	UserPlus,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FeedItemCard } from "../../components/feed/FeedItem";
import { EditProfileModal } from "../../components/profile/EditProfileModal";
import { NowPlaying } from "../../components/profile/NowPlaying";
import { SafeImage } from "../../components/shared/SafeImage";
import { getArticlesByUser } from "../../lib/server/articles";
import type { FeedItem } from "../../lib/server/feed";
import { getPostsByUser } from "../../lib/server/posts";
import { getReviewsByUser } from "../../lib/server/reviews";
import {
	followUser,
	getFollowCounts,
	getUserByUsername,
	isFollowing,
	unfollowUser,
} from "../../lib/server/users";

export const Route = createFileRoute("/profile/$username")({
	component: ProfilePage,
});

function ProfilePage() {
	const { username } = Route.useParams();
	const { user: currentUser, isSignedIn } = useUser();
	const [profile, setProfile] = useState<Awaited<
		ReturnType<typeof getUserByUsername>
	> | null>(null);
	const [posts, setPosts] = useState<
		Awaited<ReturnType<typeof getPostsByUser>>["posts"]
	>([]);
	const [reviews, setReviews] = useState<
		Awaited<ReturnType<typeof getReviewsByUser>>
	>([]);
	const [articles, setArticles] = useState<
		Awaited<ReturnType<typeof getArticlesByUser>>
	>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [following, setFollowing] = useState(false);
	const [followCounts, setFollowCounts] = useState({
		followers: 0,
		following: 0,
	});
	const [isFollowingLoading, setIsFollowingLoading] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const isOwnProfile = isSignedIn && currentUser?.username === username;

	const loadProfile = useCallback(
		async (showLoading = true) => {
			if (showLoading) setIsLoading(true);
			try {
				const profileData = await getUserByUsername({ data: username });
				if (profileData) {
					setProfile(profileData);
					const [postsData, reviewsData, articlesData, counts] =
						await Promise.all([
							getPostsByUser({ data: { username, clerkId: currentUser?.id } }),
							getReviewsByUser({
								data: {
									username,
									includeUnpublished: isOwnProfile,
									clerkId: currentUser?.id,
								},
							}),
							getArticlesByUser({
								data: {
									username,
									includeUnpublished: isOwnProfile,
									clerkId: currentUser?.id,
								},
							}),
							getFollowCounts({ data: profileData.id }),
						]);
					setPosts(postsData.posts);
					setReviews(reviewsData);
					setArticles(articlesData);
					setFollowCounts(counts);

					// Check if current user follows this profile
					if (isSignedIn && currentUser && !isOwnProfile) {
						const isFollowingResult = await isFollowing({
							data: { clerkId: currentUser.id, targetUserId: profileData.id },
						});
						setFollowing(isFollowingResult);
					}
				}
			} catch (error) {
				console.error("Failed to load profile:", error);
			} finally {
				if (showLoading) setIsLoading(false);
			}
		},
		[username, isOwnProfile, isSignedIn, currentUser],
	);

	useEffect(() => {
		loadProfile();
	}, [loadProfile]);

	const handleFollowToggle = async () => {
		if (!currentUser || !profile || isOwnProfile) return;
		setIsFollowingLoading(true);
		try {
			if (following) {
				await unfollowUser({
					data: { clerkId: currentUser.id, targetUserId: profile.id },
				});
				setFollowing(false);
				setFollowCounts((prev) => ({ ...prev, followers: prev.followers - 1 }));
			} else {
				await followUser({
					data: { clerkId: currentUser.id, targetUserId: profile.id },
				});
				setFollowing(true);
				setFollowCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
			}
		} catch (error) {
			console.error("Failed to toggle follow:", error);
		} finally {
			setIsFollowingLoading(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-2">User Not Found</h1>
					<Link to="/" className="text-purple-400 hover:underline">
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	const joinDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});

	// Create unified feed by combining and sorting all content chronologically
	const feedItems: FeedItem[] = [
		...posts.map((post) => ({
			type: "post" as const,
			id: post.id,
			createdAt: new Date(post.createdAt),
			author: post.author,
			content: post.content,
			likeCount: post._count.likes,
			commentCount: post._count.comments,
			hasLiked: post.likes.length > 0,
		})),
		...reviews.map((review) => ({
			type: "review" as const,
			id: review.id,
			createdAt: new Date(review.createdAt),
			author: review.author,
			content: review.content,
			title: review.title,
			rating: review.rating,
			coverImageUrl: review.coverImageUrl,
			containsSpoilers: review.containsSpoilers,
			game: review.game,
			likeCount: review._count.likes,
			commentCount: review._count.comments,
			hasLiked: review.likes.length > 0,
		})),
		...articles.map((article) => ({
			type: "article" as const,
			id: article.id,
			createdAt: new Date(article.createdAt),
			author: article.author,
			content: article.content,
			title: article.title,
			excerpt: article.excerpt ?? undefined,
			coverImageUrl: article.coverImageUrl,
			containsSpoilers: article.containsSpoilers,
			games: article.games.map((g) => g.game),
			likeCount: article._count.likes,
			commentCount: article._count.comments,
			hasLiked: article.likes.length > 0,
		})),
	].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			{/* Banner - 3:1 aspect ratio (Twitter-style), full width */}
			<div
				className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
				style={{
					aspectRatio: "3/1",
					...(profile.bannerUrl
						? {
								backgroundImage: `url(${profile.bannerUrl})`,
								backgroundSize: "cover",
								backgroundPosition: "center",
							}
						: {}),
				}}
			/>

			<div className="container mx-auto px-4">
				{/* Profile Header */}
				<div className="relative -mt-16 mb-6">
					<div className="flex flex-col md:flex-row items-start md:items-end gap-4">
						{/* Avatar */}
						<div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-4 border-gray-900 overflow-hidden">
							<SafeImage
								src={profile.avatarUrl || undefined}
								alt={profile.username}
								className="w-full h-full object-cover"
								fallback={
									<div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold">
										{(profile.displayName || profile.username)[0].toUpperCase()}
									</div>
								}
							/>
						</div>

						{/* Info */}
						<div className="flex-1">
							<div className="flex items-center gap-4 flex-wrap">
								<h1 className="text-2xl font-bold text-white">
									{profile.displayName || profile.username}
								</h1>
								{isOwnProfile ? (
									<div className="flex items-center gap-2">
										<Link
											to="/drafts"
											className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white text-sm font-medium"
										>
											<FileText size={16} />
											Drafts
										</Link>
										<button
											type="button"
											onClick={() => setIsEditModalOpen(true)}
											className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
											title="Edit Profile"
										>
											<Edit size={18} className="text-gray-400" />
										</button>
									</div>
								) : (
									isSignedIn && (
										<button
											type="button"
											onClick={handleFollowToggle}
											disabled={isFollowingLoading}
											className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
												following
													? "bg-gray-800 text-gray-300 hover:bg-red-500/20 hover:text-red-400"
													: "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
											}`}
										>
											{following ? (
												<>
													<UserMinus size={18} />
													<span>Unfollow</span>
												</>
											) : (
												<>
													<UserPlus size={18} />
													<span>Follow</span>
												</>
											)}
										</button>
									)
								)}
							</div>
							<p className="text-gray-500">@{profile.username}</p>

							{/* Stats */}
							<div className="flex items-center gap-4 mt-2 text-sm">
								<span className="flex items-center gap-1 text-gray-400">
									<Users size={14} />
									<span className="text-white font-medium">
										{followCounts.followers}
									</span>{" "}
									followers
								</span>
								<span className="text-gray-400">
									<span className="text-white font-medium">
										{followCounts.following}
									</span>{" "}
									following
								</span>
								<span className="flex items-center gap-1 text-gray-500">
									<Calendar size={14} />
									Joined {joinDate}
								</span>
							</div>
						</div>
					</div>

					{profile.bio && (
						<p className="mt-4 text-gray-300 max-w-2xl">{profile.bio}</p>
					)}
				</div>

				{/* Now Playing / Quest Log */}
				<NowPlaying username={username} isOwnProfile={!!isOwnProfile} />

				{/* Content Feed */}
				<div className="pb-8 space-y-4">
					{feedItems.length > 0 ? (
						feedItems.map((item) => (
							<FeedItemCard key={`${item.type}-${item.id}`} item={item} />
						))
					) : (
						<div className="text-center py-12 text-gray-500">
							No content yet
						</div>
					)}
				</div>
			</div>

			{profile && (
				<EditProfileModal
					isOpen={isEditModalOpen}
					onClose={() => setIsEditModalOpen(false)}
					onSave={() => {
						// Reload profile data from server to get fresh data
						loadProfile(false);
					}}
					user={profile}
				/>
			)}
		</div>
	);
}
