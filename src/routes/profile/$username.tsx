import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Calendar,
	ChevronRight,
	Edit,
	FileText,
	Package,
	UserMinus,
	UserPlus,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { FeedItem } from "../../components/feed/FeedItem";
import { FeedItemCard } from "../../components/feed/FeedItem";
import { EditProfileModal } from "../../components/profile/EditProfileModal";
import { FollowListModal } from "../../components/profile/FollowListModal";
import { NowPlaying } from "../../components/profile/NowPlaying";
import { SafeImage } from "../../components/shared/SafeImage";
import { getConvexClient } from "../../lib/convex-server";
import { buildMeta, seoTitle, seoUrl, truncate } from "../../lib/seo";

export const Route = createFileRoute("/profile/$username")({
	loader: async ({ params }) => {
		try {
			const client = getConvexClient();
			const profile = await client.query(api.users.getByUsername, {
				username: params.username,
			});
			return { profile };
		} catch {
			return { profile: null };
		}
	},
	head: ({ loaderData }) => {
		const profile = loaderData?.profile;
		if (!profile) return {};
		const displayName = profile.displayName || profile.username;
		const description = profile.bio
			? truncate(profile.bio)
			: `Check out ${displayName}'s profile on Think Ribbon`;
		return {
			meta: buildMeta({
				title: seoTitle(`${displayName} (@${profile.username})`),
				description,
				url: seoUrl(`/profile/${profile.username}`),
				image: profile.avatarUrl,
				type: "profile",
			}),
		};
	},
	component: ProfilePage,
});

function ProfilePage() {
	const { username } = Route.useParams();
	const { user: currentUser, isSignedIn } = useUser();
	const [isFollowingLoading, setIsFollowingLoading] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [followListType, setFollowListType] = useState<
		"followers" | "following" | null
	>(null);

	const isOwnProfile = isSignedIn && currentUser?.username === username;

	// Convex queries
	const profile = useQuery(api.users.getByUsername, { username });
	const postsData = useQuery(
		api.posts.getByUser,
		profile ? { username, clerkId: currentUser?.id } : "skip",
	);
	const reviewsData = useQuery(
		api.reviews.getByUser,
		profile
			? {
					username,
					includeUnpublished: !!isOwnProfile,
					clerkId: currentUser?.id,
				}
			: "skip",
	);
	const articlesData = useQuery(
		api.articles.getByUser,
		profile
			? {
					username,
					includeUnpublished: !!isOwnProfile,
					clerkId: currentUser?.id,
				}
			: "skip",
	);
	const followCounts = useQuery(
		api.users.getFollowCounts,
		profile ? { userId: profile._id } : "skip",
	);
	const followingStatus = useQuery(
		api.users.isFollowing,
		isSignedIn && currentUser && profile && !isOwnProfile
			? { clerkId: currentUser.id, targetUserId: profile._id }
			: "skip",
	);
	const collectionStats = useQuery(api.collections.getCollectionStats, {
		username,
	});

	const followUserMut = useMutation(api.users.followUser);
	const unfollowUserMut = useMutation(api.users.unfollowUser);

	const isLoading = profile === undefined;
	const posts = postsData?.posts ?? [];
	const reviews = reviewsData ?? [];
	const articles = articlesData ?? [];
	const following = followingStatus ?? false;

	// Create unified feed by combining and sorting all content chronologically
	// Must be called before early returns to maintain hook order
	const feedItems = useMemo<FeedItem[]>(() => {
		return [
			...posts.map((post) => ({
				type: "post" as const,
				id: post._id,
				createdAt: post._creationTime,
				updatedAt: post.updatedAt,
				editCount: post.editCount,
				author: post.author,
				content: post.content,
				images: post.images,
				likeCount: post._count.likes,
				commentCount: post._count.comments,
				hasLiked: post.hasLiked ?? false,
			})),
			...reviews.map((review) => ({
				type: "review" as const,
				id: review._id,
				createdAt: review._creationTime,
				updatedAt: review.updatedAt,
				editCount: review.editCount,
				author: review.author,
				content: review.content,
				title: review.title,
				rating: review.rating,
				coverImageUrl: review.coverImageUrl,
				containsSpoilers: review.containsSpoilers,
				game: review.game ?? undefined,
				likeCount: review._count.likes,
				commentCount: review._count.comments,
				hasLiked: review.hasLiked ?? false,
			})),
			...articles.map((article) => ({
				type: "article" as const,
				id: article._id,
				createdAt: article._creationTime,
				updatedAt: article.updatedAt,
				editCount: article.editCount,
				author: article.author,
				content: article.content,
				title: article.title,
				excerpt: article.excerpt ?? undefined,
				coverImageUrl: article.coverImageUrl,
				containsSpoilers: article.containsSpoilers,
				games: article.games,
				likeCount: article._count.likes,
				commentCount: article._count.comments,
				hasLiked: article.hasLiked ?? false,
			})),
		].sort((a, b) => b.createdAt - a.createdAt);
	}, [posts, reviews, articles]);

	const handleFollowToggle = async () => {
		if (!currentUser || !profile || isOwnProfile) return;
		setIsFollowingLoading(true);
		try {
			if (following) {
				await unfollowUserMut({
					clerkId: currentUser.id,
					targetUserId: profile._id,
				});
			} else {
				await followUserMut({
					clerkId: currentUser.id,
					targetUserId: profile._id,
				});
			}
		} catch (error) {
			console.error("Failed to toggle follow:", error);
		} finally {
			setIsFollowingLoading(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
						User Not Found
					</h1>
					<Link to="/" className="text-slate-400 hover:underline">
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	const joinDate = new Date(profile._creationTime).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20">
			{/* Banner - 3:1 aspect ratio (Twitter-style), full width */}
			<div
				className="w-full bg-gradient-to-r from-slate-700 to-slate-600"
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
						<div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 border-4 border-gray-900 overflow-hidden">
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
								<h1
									className="text-xl sm:text-2xl font-bold text-white"
									style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
								>
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
													: "bg-gradient-to-r from-slate-700 to-slate-600 text-white hover:from-slate-600 hover:to-slate-500"
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
							<p
								className="text-gray-500"
								style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
							>
								@{profile.username}
							</p>

							{/* Stats */}
							<div
								className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-sm"
								style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
							>
								<button
									type="button"
									onClick={() => setFollowListType("followers")}
									className="flex items-center gap-1 text-gray-400 hover:text-gray-300 transition-colors"
								>
									<Users size={14} />
									<span className="text-white font-medium">
										{followCounts?.followers ?? 0}
									</span>{" "}
									followers
								</button>
								<button
									type="button"
									onClick={() => setFollowListType("following")}
									className="text-gray-400 hover:text-gray-300 transition-colors"
								>
									<span className="text-white font-medium">
										{followCounts?.following ?? 0}
									</span>{" "}
									following
								</button>
								<span className="flex items-center gap-1 text-gray-500">
									<Calendar size={14} />
									Joined {joinDate}
								</span>
							</div>
						</div>
					</div>

					{profile.bio && (
						<p
							className="mt-4 text-gray-300 max-w-2xl"
							style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
						>
							{profile.bio}
						</p>
					)}
				</div>

				{/* Collection Section */}
				{collectionStats && collectionStats.totalOwned > 0 && (
					<div className="mb-6 p-5 bg-gray-800/50 rounded-xl border border-gray-700/50">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<Package size={20} className="text-slate-400" />
								<h3 className="font-semibold text-white">Game Collection</h3>
							</div>
							<Link
								to="/collection/$username"
								params={{ username }}
								className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 transition-colors"
							>
								View All
								<ChevronRight size={16} />
							</Link>
						</div>

						{/* Stats Grid */}
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
							{/* Total Owned */}
							<div className="text-center p-3 bg-slate-500/10 rounded-lg border border-slate-500/20">
								<div className="text-xl sm:text-2xl font-bold text-slate-400">
									{collectionStats.totalOwned}
								</div>
								<div className="text-xs text-gray-400">Owned</div>
							</div>

							{/* Playing */}
							{collectionStats.playing > 0 && (
								<div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
									<div className="text-xl sm:text-2xl font-bold text-green-400">
										{collectionStats.playing}
									</div>
									<div className="text-xs text-gray-400">Playing</div>
								</div>
							)}

							{/* Beaten */}
							{collectionStats.beaten > 0 && (
								<div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
									<div className="text-xl sm:text-2xl font-bold text-blue-400">
										{collectionStats.beaten}
									</div>
									<div className="text-xs text-gray-400">Beaten</div>
								</div>
							)}

							{/* Completed */}
							{collectionStats.completed > 0 && (
								<div className="text-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
									<div className="text-xl sm:text-2xl font-bold text-amber-400">
										{collectionStats.completed}
									</div>
									<div className="text-xs text-gray-400">Completed</div>
								</div>
							)}

							{/* Backlog */}
							{collectionStats.backlog > 0 && (
								<div className="text-center p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
									<div className="text-xl sm:text-2xl font-bold text-gray-400">
										{collectionStats.backlog}
									</div>
									<div className="text-xs text-gray-400">Backlog</div>
								</div>
							)}

							{/* On Hold */}
							{collectionStats.onHold > 0 && (
								<div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
									<div className="text-xl sm:text-2xl font-bold text-yellow-400">
										{collectionStats.onHold}
									</div>
									<div className="text-xs text-gray-400">On Hold</div>
								</div>
							)}

							{/* Dropped */}
							{collectionStats.dropped > 0 && (
								<div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
									<div className="text-xl sm:text-2xl font-bold text-red-400">
										{collectionStats.dropped}
									</div>
									<div className="text-xs text-gray-400">Dropped</div>
								</div>
							)}

							{/* Unplayed */}
							{collectionStats.unplayed > 0 && (
								<div className="text-center p-3 bg-slate-500/10 rounded-lg border border-slate-500/20">
									<div className="text-xl sm:text-2xl font-bold text-slate-400">
										{collectionStats.unplayed}
									</div>
									<div className="text-xs text-gray-400">Unplayed</div>
								</div>
							)}
						</div>
					</div>
				)}

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
				<>
					<EditProfileModal
						isOpen={isEditModalOpen}
						onClose={() => setIsEditModalOpen(false)}
						onSave={() => {
							// Convex reactivity handles refresh automatically
						}}
						user={{
							id: profile._id,
							clerkId: profile.clerkId,
							username: profile.username,
							displayName: profile.displayName ?? null,
							bio: profile.bio ?? null,
							avatarUrl: profile.avatarUrl ?? null,
							bannerUrl: profile.bannerUrl ?? null,
						}}
					/>
					<FollowListModal
						isOpen={followListType !== null}
						onClose={() => setFollowListType(null)}
						userId={profile._id}
						type={followListType ?? "followers"}
					/>
				</>
			)}
		</div>
	);
}
