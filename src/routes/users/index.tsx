import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	BookOpen,
	Gamepad2,
	Library,
	Loader2,
	Search,
	Star,
	Users,
} from "lucide-react";
import { memo, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { SafeImage } from "../../components/shared/SafeImage";

interface UsersSearchParams {
	q?: string;
}

export const Route = createFileRoute("/users/")({
	component: UsersPage,
	validateSearch: (search: Record<string, unknown>): UsersSearchParams => {
		return {
			q: typeof search.q === "string" ? search.q : undefined,
		};
	},
});

interface UserWithStats {
	_id: string;
	username: string;
	displayName?: string;
	avatarUrl?: string;
	bio?: string;
	_count: {
		reviews: number;
		articles: number;
		posts: number;
		collection: number;
		questLog: number;
		followers: number;
	};
}

const UserCard = memo(function UserCard({ user }: { user: UserWithStats }) {
	const hasActivity =
		user._count.reviews > 0 ||
		user._count.articles > 0 ||
		user._count.posts > 0;

	return (
		<Link
			to="/profile/$username"
			params={{ username: user.username }}
			className="group bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/50 rounded-xl p-4 transition-all"
		>
			<div className="flex items-start gap-4">
				{/* Avatar */}
				<div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 overflow-hidden">
					<SafeImage
						src={user.avatarUrl}
						alt={user.username}
						className="w-full h-full object-cover"
						fallback={
							<span className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
								{(user.displayName || user.username)[0].toUpperCase()}
							</span>
						}
					/>
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
						{user.displayName || user.username}
					</h3>
					<p className="text-sm text-gray-500 truncate">@{user.username}</p>

					{/* Bio preview */}
					{user.bio && (
						<p className="text-sm text-gray-400 mt-1 line-clamp-2">
							{user.bio}
						</p>
					)}

					{/* Stats */}
					<div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
						{user._count.reviews > 0 && (
							<span className="flex items-center gap-1">
								<Star size={12} className="text-yellow-500" />
								{user._count.reviews} review
								{user._count.reviews !== 1 ? "s" : ""}
							</span>
						)}
						{user._count.articles > 0 && (
							<span className="flex items-center gap-1">
								<BookOpen size={12} className="text-blue-400" />
								{user._count.articles} article
								{user._count.articles !== 1 ? "s" : ""}
							</span>
						)}
						{user._count.collection > 0 && (
							<span className="flex items-center gap-1">
								<Library size={12} className="text-emerald-400" />
								{user._count.collection} game
								{user._count.collection !== 1 ? "s" : ""}
							</span>
						)}
						{user._count.questLog > 0 && (
							<span className="flex items-center gap-1">
								<Gamepad2 size={12} className="text-purple-400" />
								{user._count.questLog} playing
							</span>
						)}
						{user._count.followers > 0 && (
							<span className="flex items-center gap-1">
								<Users size={12} className="text-pink-400" />
								{user._count.followers} follower
								{user._count.followers !== 1 ? "s" : ""}
							</span>
						)}
						{!hasActivity && user._count.followers === 0 && (
							<span className="text-gray-600">New member</span>
						)}
					</div>
				</div>
			</div>
		</Link>
	);
});

function UsersPage() {
	const navigate = useNavigate();
	const { q: searchQuery = "" } = Route.useSearch();

	// Local state for input (to avoid URL update on every keystroke)
	const [inputValue, setInputValue] = useState(searchQuery);

	// Sync input value when URL changes (e.g., back button)
	useEffect(() => {
		setInputValue(searchQuery);
	}, [searchQuery]);

	// Debounced URL update for search
	useEffect(() => {
		const timeout = setTimeout(() => {
			if (inputValue !== searchQuery) {
				navigate({
					to: "/users",
					search: { q: inputValue || undefined },
				});
			}
		}, 300);

		return () => clearTimeout(timeout);
	}, [inputValue, searchQuery, navigate]);

	// Queries
	const discoverUsers = useQuery(api.users.getDiscoverUsers, { limit: 15 });
	const searchResults = useQuery(
		api.users.searchUsers,
		searchQuery.trim() ? { query: searchQuery, limit: 20 } : "skip",
	);

	const isLoading =
		discoverUsers === undefined ||
		(searchQuery.trim() && searchResults === undefined);
	const isSearching = searchQuery.trim() && searchResults === undefined;

	const displayedUsers = searchQuery.trim()
		? (searchResults as UserWithStats[] | undefined)
		: (discoverUsers as UserWithStats[] | undefined);

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
						Discover Gamers
					</h1>
					<p className="text-gray-400">
						Find and connect with fellow gamers in the community
					</p>
				</div>

				{/* Search */}
				<div className="max-w-xl mx-auto mb-8">
					<div className="relative">
						<Search
							className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							placeholder="Search for users..."
							className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
						/>
						{isSearching && (
							<div className="absolute right-4 top-1/2 -translate-y-1/2">
								<div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
							</div>
						)}
					</div>
				</div>

				{/* Results */}
				{isLoading ? (
					<div className="flex flex-col items-center justify-center py-12">
						<Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
						<p className="text-gray-400">Loading users...</p>
					</div>
				) : displayedUsers && displayedUsers.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{displayedUsers.map((user) => (
							<UserCard key={user._id} user={user} />
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
						<p className="text-gray-500">
							{searchQuery.trim()
								? `No users found for "${searchQuery}"`
								: "No users to display"}
						</p>
					</div>
				)}

				{/* Refresh hint */}
				{!searchQuery.trim() && displayedUsers && displayedUsers.length > 0 && (
					<p className="text-center text-gray-600 text-sm mt-8">
						Showing random users. Refresh the page to see different members.
					</p>
				)}
			</div>
		</div>
	);
}
