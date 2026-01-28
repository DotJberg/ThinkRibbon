import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { FeedItemCard } from "../components/feed/FeedItem";
import { PostComposer } from "../components/posts/PostComposer";
import {
	type FeedItem,
	getFollowingFeed,
	getPopularFeed,
} from "../lib/server/feed";
import { createPost } from "../lib/server/posts";
import { syncUser } from "../lib/server/users";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const { user, isSignedIn, isLoaded } = useUser();
	const [activeTab, setActiveTab] = useState<"following" | "popular">(
		"following",
	);
	const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasMore, setHasMore] = useState(false);
	const [cursor, setCursor] = useState<string | undefined>();

	// Set default tab based on auth state
	useEffect(() => {
		if (isLoaded) {
			setActiveTab(isSignedIn ? "following" : "popular");
		}
	}, [isLoaded, isSignedIn]);

	// Sync user on sign in
	useEffect(() => {
		if (user) {
			syncUser({
				data: {
					clerkId: user.id,
					email: user.primaryEmailAddress?.emailAddress || "",
					username: user.username || user.id,
					displayName: user.fullName || undefined,
					avatarUrl: user.imageUrl || undefined,
				},
			}).catch(console.error);
		}
	}, [user]);

	// Load feed
	useEffect(() => {
		const loadFeed = async () => {
			setIsLoading(true);
			try {
				if (activeTab === "following" && isSignedIn && user) {
					const result = await getFollowingFeed({
						data: { clerkId: user.id, limit: 20 },
					});
					setFeedItems(result.items);
					setHasMore(!!result.nextCursor);
					setCursor(result.nextCursor);
				} else {
					const result = await getPopularFeed({
						data: { limit: 20 },
					});
					setFeedItems(result.items);
					setHasMore(!!result.nextCursor);
					setCursor(result.nextCursor);
				}
			} catch (error) {
				console.error("Failed to load feed:", error);
			} finally {
				setIsLoading(false);
			}
		};

		if (isLoaded) {
			loadFeed();
		}
	}, [activeTab, isSignedIn, user, isLoaded]);

	const handleCreatePost = async (content: string) => {
		if (!user) return;
		try {
			await createPost({
				data: { content, authorClerkId: user.id },
			});
			// Refresh feed
			const result =
				activeTab === "following" && isSignedIn
					? await getFollowingFeed({ data: { clerkId: user.id, limit: 20 } })
					: await getPopularFeed({ data: { limit: 20 } });
			setFeedItems(result.items);
		} catch (error) {
			console.error("Failed to create post:", error);
		}
	};

	const loadMore = async () => {
		if (!cursor) return;
		try {
			const result =
				activeTab === "following" && isSignedIn && user
					? await getFollowingFeed({
							data: { clerkId: user.id, cursor, limit: 20 },
						})
					: await getPopularFeed({ data: { cursor, limit: 20 } });
			setFeedItems((prev) => [...prev, ...result.items]);
			setHasMore(!!result.nextCursor);
			setCursor(result.nextCursor);
		} catch (error) {
			console.error("Failed to load more:", error);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8">
				{/* Hero Section */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
						ThinkRibbon
					</h1>
					<p className="text-gray-400">
						Independent gaming journalism and community
					</p>
				</div>

				<div className="max-w-2xl mx-auto">
					{/* Tabs */}
					<div className="flex gap-2 mb-6">
						{isSignedIn && (
							<button
								type="button"
								onClick={() => setActiveTab("following")}
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
						<button
							type="button"
							onClick={() => setActiveTab("popular")}
							className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
								activeTab === "popular"
									? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
									: "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
							}`}
						>
							<TrendingUp size={18} />
							Popular
						</button>
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
							<>
								{[1, 2, 3].map((i) => (
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
								))}
							</>
						) : feedItems.length === 0 ? (
							// Empty state
							<div className="text-center py-12">
								<div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
									{activeTab === "following" ? (
										<Users className="text-gray-600" size={32} />
									) : (
										<TrendingUp className="text-gray-600" size={32} />
									)}
								</div>
								<h3 className="text-lg font-medium text-gray-300 mb-2">
									{activeTab === "following"
										? "Your timeline is empty"
										: "No trending content yet"}
								</h3>
								<p className="text-gray-500 mb-4">
									{activeTab === "following"
										? "Follow some users to see their posts, reviews, and articles here!"
										: "Be the first to share something today!"}
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
							<>
								{feedItems.map((item) => (
									<FeedItemCard key={`${item.type}-${item.id}`} item={item} />
								))}
								{hasMore && (
									<button
										type="button"
										onClick={loadMore}
										className="w-full py-3 text-center text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
									>
										Load more
									</button>
								)}
							</>
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
