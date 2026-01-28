import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { getUserByClerkId } from "../../lib/server/users";

interface PostComposerProps {
	onSubmit: (content: string) => Promise<void>;
	maxLength?: number;
}

export function PostComposer({ onSubmit, maxLength = 280 }: PostComposerProps) {
	const { user } = useUser();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

	// Fetch user's custom avatar from database
	useEffect(() => {
		if (!user?.id) return;

		const fetchUser = () => {
			getUserByClerkId({ data: user.id })
				.then((userData) => {
					if (userData?.avatarUrl) {
						setAvatarUrl(userData.avatarUrl);
					}
				})
				.catch(console.error);
		};

		fetchUser();
		// Re-fetch after a short delay to catch sync in progress
		const timer = setTimeout(fetchUser, 1000);
		return () => clearTimeout(timer);
	}, [user?.id]);

	// Use database avatar if available, otherwise fall back to Clerk avatar
	const displayAvatarUrl = avatarUrl || user?.imageUrl;

	const remaining = maxLength - content.length;
	const isOverLimit = remaining < 0;
	const isEmpty = content.trim().length === 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isEmpty || isOverLimit || isSubmitting) return;

		setIsSubmitting(true);
		try {
			await onSubmit(content);
			setContent("");
		} catch (error) {
			console.error("Failed to create post:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!user) {
		return (
			<div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center">
				<p className="text-gray-400">Sign in to post</p>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4"
		>
			<div className="flex gap-3">
				{/* Avatar */}
				<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
					{displayAvatarUrl ? (
						<img
							src={displayAvatarUrl}
							alt={user.username || ""}
							className="w-full h-full object-cover"
						/>
					) : (
						<span className="text-white font-bold text-sm">
							{(user.firstName || user.username || "U")[0].toUpperCase()}
						</span>
					)}
				</div>

				<div className="flex-1">
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="What's on your mind?"
						rows={3}
						className="w-full bg-transparent text-white placeholder:text-gray-500 resize-none focus:outline-none text-lg"
					/>

					<div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
						<div
							className={`text-sm ${isOverLimit ? "text-red-400" : remaining < 20 ? "text-yellow-400" : "text-gray-500"}`}
						>
							{remaining}
						</div>
						<button
							type="submit"
							disabled={isEmpty || isOverLimit || isSubmitting}
							className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-full text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Posting..." : "Post"}
						</button>
					</div>
				</div>
			</div>
		</form>
	);
}
