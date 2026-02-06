import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Compass, Gamepad2, TrendingUp, Users } from "lucide-react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";
import type { FeedItem } from "../components/feed/FeedItem";
import { FeedItemCard } from "../components/feed/FeedItem";
import {
	type DiscoverFeedType,
	FeedSelector,
} from "../components/feed/FeedSelector";
import { PostComposer } from "../components/posts/PostComposer";
import type { LinkPreviewData } from "../lib/link-preview";

// Cache feed data across navigations so scroll restoration works on back nav
const feedCache = new Map<string, FeedItem[]>();

interface HomeSearchParams {
	view?: "following" | "discover";
	sub?: DiscoverFeedType;
}

export const Route = createFileRoute("/")({
	component: HomePage,
	validateSearch: (search: Record<string, unknown>): HomeSearchParams => ({
		view: ["following", "discover"].includes(search.view as string)
			? (search.view as "following" | "discover")
			: undefined,
		sub: ["discover", "popular"].includes(search.sub as string)
			? (search.sub as DiscoverFeedType)
			: undefined,
	}),
});

function HomePage() {
	const { user, isSignedIn, isLoaded } = useUser();
	const navigate = useNavigate();
	const { view, sub } = Route.useSearch();

	const activeTab = view ?? "discover";
	const discoverFeedType = sub ?? "discover";

	// Feed queries - use "skip" for inactive tabs
	const followingData = useQuery(
		api.feed.getFollowing,
		activeTab === "following" && isSignedIn && user
			? { clerkId: user.id, limit: 20 }
			: "skip",
	);

	const popularData = useQuery(
		api.feed.getPopular,
		activeTab === "discover" && discoverFeedType === "popular"
			? { clerkId: user?.id, limit: 20 }
			: "skip",
	);

	const discoverData = useQuery(
		api.feed.getDiscover,
		activeTab === "discover" && discoverFeedType === "discover"
			? { clerkId: user?.id, limit: 20 }
			: "skip",
	);

	const createPostMut = useMutation(api.posts.create);

	// Determine active feed data, using cache to prevent loading skeleton on back nav
	const feedKey =
		activeTab === "following" ? "following" : `discover-${discoverFeedType}`;
	const rawData =
		activeTab === "following"
			? followingData
			: discoverFeedType === "popular"
				? popularData
				: discoverData;

	let feedItems: FeedItem[] = [];
	let isLoading = false;

	if (!isLoaded) {
		isLoading = true;
	} else if (rawData !== undefined) {
		feedItems = rawData.items ?? [];
		feedCache.set(feedKey, feedItems);
	} else if (feedCache.get(feedKey)) {
		feedItems = feedCache.get(feedKey) ?? [];
	} else {
		isLoading = true;
	}

	const handleCreatePost = useCallback(
		async (
			content: string,
			images: { url: string; fileKey: string }[],
			linkPreview?: LinkPreviewData,
		) => {
			if (!user) return;
			await createPostMut({
				content,
				authorClerkId: user.id,
				images:
					images.length > 0
						? images.map((img) => ({
								url: img.url,
								fileKey: img.fileKey,
							}))
						: undefined,
				linkPreview:
					images.length === 0 && linkPreview
						? {
								url: linkPreview.url,
								title: linkPreview.title,
								description: linkPreview.description,
								imageUrl: linkPreview.imageUrl,
								siteName: linkPreview.siteName,
								domain: linkPreview.domain,
							}
						: undefined,
			});
		},
		[user, createPostMut],
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8">
				{/* Hero Section */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
						Think Ribbon
					</h1>
					<p className="text-gray-400">
						Independent gaming journalism and community
					</p>
				</div>

				<div className="max-w-2xl mx-auto">
					{/* Tabs */}
					<div className="flex gap-2 mb-6">
						<FeedSelector
							selectedFeed={discoverFeedType}
							onFeedChange={(feed) => {
								navigate({
									to: "/",
									search: {
										view: "discover",
										sub: feed === "discover" ? undefined : feed,
									},
									replace: true,
								});
							}}
							isActive={activeTab === "discover"}
						/>
						{isSignedIn && (
							<button
								type="button"
								onClick={() =>
									navigate({
										to: "/",
										search: { view: "following" },
										replace: true,
									})
								}
								className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
									activeTab === "following"
										? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
										: "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
								}`}
							>
								<Users size={18} />
								Following
							</button>
						)}
					</div>

					{/* Post Composer (signed in only) */}
					{isSignedIn && (
						<div className="mb-6">
							<PostComposer onSubmit={handleCreatePost} maxLength={280} />
						</div>
					)}

					{/* Feed */}
					<div className="space-y-4">
						{isLoading ? (
							// Loading skeleton
							[1, 2, 3].map((i) => (
								<div
									key={i}
									className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 animate-pulse"
								>
									<div className="flex items-center gap-3 mb-4">
										<div className="w-10 h-10 rounded-full bg-gray-700" />
										<div className="flex-1">
											<div className="h-4 bg-gray-700 rounded w-32 mb-2" />
											<div className="h-3 bg-gray-700/50 rounded w-24" />
										</div>
									</div>
									<div className="space-y-2">
										<div className="h-4 bg-gray-700/50 rounded w-full" />
										<div className="h-4 bg-gray-700/50 rounded w-3/4" />
									</div>
								</div>
							))
						) : feedItems.length === 0 ? (
							// Empty state
							<div className="text-center py-12">
								<div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
									{activeTab === "following" ? (
										<Users className="text-gray-600" size={32} />
									) : discoverFeedType === "popular" ? (
										<TrendingUp className="text-gray-600" size={32} />
									) : (
										<Compass className="text-gray-600" size={32} />
									)}
								</div>
								<h3 className="text-lg font-medium text-gray-300 mb-2">
									{activeTab === "following"
										? "Your timeline is empty"
										: discoverFeedType === "popular"
											? "No trending content yet"
											: "Nothing to discover yet"}
								</h3>
								<p className="text-gray-500 mb-4">
									{activeTab === "following"
										? "Follow some users to see their posts, reviews, and articles here!"
										: "Be the first to share something!"}
								</p>
								{activeTab === "following" && (
									<Link
										to="/games"
										className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
									>
										<Gamepad2 size={18} />
										Browse Games & Find People
									</Link>
								)}
							</div>
						) : (
							// Feed items
							feedItems.map((item) => (
								<FeedItemCard key={`${item.type}-${item.id}`} item={item} />
							))
						)}
					</div>
				</div>

				{/* Sidebar - Browse Games CTA */}
				{!isSignedIn && (
					<div className="fixed bottom-6 right-6">
						<Link
							to="/games"
							className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:from-purple-500 hover:to-pink-500 transition-all"
						>
							<Gamepad2 size={20} />
							Browse Games
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
