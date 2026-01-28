import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	Star,
	UserMinus,
	UserPlus,
	Users,
	Edit,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ArticleCard } from "../../components/articles/ArticleCard";
import { PostCard } from "../../components/posts/PostCard";
import { EditProfileModal } from "../../components/profile/EditProfileModal";
import { getArticlesByUser } from "../../lib/server/articles";
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
	const [activeTab, setActiveTab] = useState<"posts" | "reviews" | "articles">(
		"posts",
	);
	const [following, setFollowing] = useState(false);
	const [followCounts, setFollowCounts] = useState({
		followers: 0,
		following: 0,
	});
	const [isFollowingLoading, setIsFollowingLoading] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const isOwnProfile = isSignedIn && currentUser?.username === username;

	useEffect(() => {
		const loadProfile = async () => {
			setIsLoading(true);
			try {
				const profileData = await getUserByUsername({ data: username });
				if (profileData) {
					setProfile(profileData);
					const [postsData, reviewsData, articlesData, counts] =
						await Promise.all([
							getPostsByUser({ data: { username } }),
							getReviewsByUser({
								data: { username, includeUnpublished: isOwnProfile },
							}),
							getArticlesByUser({
								data: { username, includeUnpublished: isOwnProfile },
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
				setIsLoading(false);
			}
		};
		loadProfile();
	}, [username, isOwnProfile, isSignedIn, currentUser]);

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

	const tabs = [
		{ id: "posts", label: "Posts", count: profile._count.posts },
		{ id: "reviews", label: "Reviews", count: profile._count.reviews },
		{ id: "articles", label: "Articles", count: profile._count.articles },
	] as const;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			{/* Banner */}
			<div
				className="h-48 md:h-64 bg-gradient-to-r from-purple-600 to-pink-600"
				style={
					profile.bannerUrl
						? {
								backgroundImage: `url(${profile.bannerUrl})`,
								backgroundSize: "cover",
								backgroundPosition: "center",
							}
						: {}
				}
			/>

			<div className="container mx-auto px-4">
				{/* Profile Header */}
				<div className="relative -mt-16 mb-6">
					<div className="flex flex-col md:flex-row items-start md:items-end gap-4">
						{/* Avatar */}
						<div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-4 border-gray-900 overflow-hidden">
							{profile.avatarUrl ? (
								<img
									src={profile.avatarUrl}
									alt={profile.username}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold">
									{(profile.displayName || profile.username)[0].toUpperCase()}
								</div>
							)}
						</div>

						{/* Info */}
						<div className="flex-1">
							<div className="flex items-center gap-4 flex-wrap">
								<h1 className="text-2xl font-bold text-white">
									{profile.displayName || profile.username}
								</h1>
								{isOwnProfile ? (
									// TODO: Implement settings page
									// <Link
									// 	to="/settings/profile"
									// 	className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
									// >
									// 	<Settings size={18} className="text-gray-400" />
									// </Link>
									<button
										type="button"
										onClick={() => setIsEditModalOpen(true)}
										className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
										title="Edit Profile"
									>
										<Edit size={18} className="text-gray-400" />
									</button>
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

				{/* Tabs */}
				<div className="flex gap-2 mb-6 p-1 bg-gray-800/50 rounded-xl max-w-md">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
								activeTab === tab.id
									? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
									: "text-gray-400 hover:text-white"
							}`}
						>
							{tab.label} ({tab.count})
						</button>
					))}
				</div>

				{/* Content */}
				<div className="pb-8 space-y-4">
					{activeTab === "posts" &&
						(posts.length > 0 ? (
							posts.map((post) => (
								<PostCard
									key={post.id}
									post={post}
									isAuthenticated={isSignedIn}
								/>
							))
						) : (
							<div className="text-center py-12 text-gray-500">
								No posts yet
							</div>
						))}
					{activeTab === "reviews" &&
						(reviews.length > 0 ? (
							reviews.map((review) => (
								<div
									key={review.id}
									className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
								>
									<div className="flex items-start gap-4">
										{review.game.coverUrl && (
											<img
												src={review.game.coverUrl}
												alt=""
												className="w-16 h-20 object-cover rounded"
											/>
										)}
										<div>
											<Link
												to="/reviews/$id"
												params={{ id: review.id }}
												className="text-lg font-semibold text-white hover:text-purple-400"
											>
												{review.title}
											</Link>
											<p className="text-sm text-gray-400">
												{review.game.name}
											</p>
											<div className="flex items-center gap-1 mt-1">
												{[...Array(5)].map((_, i) => (
													<Star
														// biome-ignore lint/suspicious/noArrayIndexKey: Static array
														key={i}
														size={14}
														className={
															i < review.rating
																? "fill-yellow-400 text-yellow-400"
																: "text-gray-600"
														}
													/>
												))}
											</div>
										</div>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-12 text-gray-500">
								No reviews yet
							</div>
						))}
					{activeTab === "articles" &&
						(articles.length > 0 ? (
							articles.map((article) => (
								<ArticleCard
									key={article.id}
									article={article}
									isAuthenticated={isSignedIn}
								/>
							))
						) : (
							<div className="text-center py-12 text-gray-500">
								No articles yet
							</div>
						))}
				</div>
			</div>

			{profile && (
				<EditProfileModal
					isOpen={isEditModalOpen}
					onClose={() => setIsEditModalOpen(false)}
					user={profile}
				/>
			)}
		</div>
	);
}
