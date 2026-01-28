import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { LikeButton } from "../../components/shared/LikeButton";
import { StarRating } from "../../components/shared/StarRating";
import { getReviewById, toggleReviewLike } from "../../lib/server/reviews";

export const Route = createFileRoute("/reviews/$id")({
	component: ReviewDetailPage,
});

function ReviewDetailPage() {
	const { id } = Route.useParams();
	const { user, isSignedIn } = useUser();
	const [review, setReview] = useState<Awaited<
		ReturnType<typeof getReviewById>
	> | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadReview = async () => {
			setIsLoading(true);
			try {
				const data = await getReviewById({ data: id });
				setReview(data);
			} catch (error) {
				console.error("Failed to load review:", error);
			} finally {
				setIsLoading(false);
			}
		};
		loadReview();
	}, [id]);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!review) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-2">
						Review Not Found
					</h1>
					<Link to="/" className="text-purple-400 hover:underline">
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	const createdAt = new Date(review.createdAt).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					Back
				</Link>

				<article>
					{/* Header */}
					<div className="flex flex-col md:flex-row gap-6 mb-8">
						{/* Game Cover */}
						<Link to="/games/$slug" params={{ slug: review.game.slug }}>
							<div className="w-32 md:w-40 aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
								{review.game.coverUrl ? (
									<img
										src={review.game.coverUrl}
										alt={review.game.name}
										className="w-full h-full object-cover"
									/>
								) : null}
							</div>
						</Link>

						<div className="flex-1">
							<Link
								to="/games/$slug"
								params={{ slug: review.game.slug }}
								className="text-purple-400 hover:text-purple-300 text-sm font-medium"
							>
								{review.game.name}
							</Link>
							<h1 className="text-3xl font-bold text-white mt-1 mb-4">
								{review.title}
							</h1>
							<StarRating rating={review.rating} size="lg" />

							{/* Author */}
							<div className="flex items-center gap-3 mt-4">
								<Link
									to="/profile/$username"
									params={{ username: review.author.username }}
								>
									<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
										{review.author.avatarUrl ? (
											<img
												src={review.author.avatarUrl}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<span className="w-full h-full flex items-center justify-center text-white font-bold">
												{(review.author.displayName ||
													review.author.username)[0].toUpperCase()}
											</span>
										)}
									</div>
								</Link>
								<div>
									<Link
										to="/profile/$username"
										params={{ username: review.author.username }}
										className="text-white font-medium hover:text-purple-400"
									>
										{review.author.displayName || review.author.username}
									</Link>
									<div className="text-sm text-gray-500 flex items-center gap-1">
										<Calendar size={14} />
										{createdAt}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Content */}
					<div className="prose prose-invert prose-lg max-w-none">
						<div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 md:p-8">
							<div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
								{review.content}
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center gap-4 mt-6">
						<LikeButton
							likeCount={review._count.likes}
							onToggle={
								user
									? () =>
											toggleReviewLike({
												data: { reviewId: review.id, clerkId: user.id },
											})
									: async () => ({ liked: false })
							}
							disabled={!isSignedIn}
						/>
						<span className="flex items-center gap-1 text-gray-400">
							<MessageCircle size={18} />
							{review._count.comments} comments
						</span>
					</div>
				</article>
			</div>
		</div>
	);
}
