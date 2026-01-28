import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cloud, Gamepad2, Save } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { CoverImageUpload } from "../../components/editor/CoverImageUpload";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { SpoilerToggle } from "../../components/shared/SpoilerWarning";
import { StarRating } from "../../components/shared/StarRating";
import { getReviewById, updateReview } from "../../lib/server/reviews";

export const Route = createFileRoute("/reviews/edit/$id")({
	component: EditReviewPage,
});

function EditReviewPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const formId = useId();

	// Game info (non-editable)
	const [game, setGame] = useState<{
		id: string;
		name: string;
		slug: string;
		coverUrl: string | null;
	} | null>(null);

	// Form state
	const [title, setTitle] = useState("");
	const [content, setContent] = useState(""); // TipTap JSON string or plain text
	const [rating, setRating] = useState(0);
	const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
	const [coverFileKey, setCoverFileKey] = useState<string | null>(null);
	const [containsSpoilers, setContainsSpoilers] = useState(false);

	// Loading state
	const [isLoading, setIsLoading] = useState(true);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Auto-save debounce ref
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const initialLoadRef = useRef(true);

	// Load existing review
	useEffect(() => {
		const loadReview = async () => {
			setIsLoading(true);
			try {
				const review = await getReviewById({ data: id });
				if (review) {
					setTitle(review.title);
					setContent(review.content);
					setRating(review.rating);
					setCoverImageUrl(review.coverImageUrl);
					setContainsSpoilers(review.containsSpoilers || false);
					setGame(review.game);
				}
			} catch (error) {
				console.error("Failed to load review:", error);
				toast.error("Failed to load review");
			} finally {
				setIsLoading(false);
				// Mark initial load complete after a short delay
				setTimeout(() => {
					initialLoadRef.current = false;
				}, 100);
			}
		};
		loadReview();
	}, [id]);

	// Auto-save function
	const autoSave = useCallback(async () => {
		if (!user || !title.trim() || rating === 0 || initialLoadRef.current)
			return;

		setSaveStatus("saving");
		try {
			await updateReview({
				data: {
					reviewId: id,
					title,
					content,
					rating,
					coverImageUrl: coverImageUrl || undefined,
					coverFileKey: coverFileKey || undefined,
					containsSpoilers,
					clerkId: user.id,
				},
			});
			setLastSaved(new Date());
			setSaveStatus("saved");
		} catch (error) {
			console.error("Auto-save failed:", error);
			setSaveStatus("idle");
		}
	}, [
		user,
		id,
		title,
		content,
		rating,
		coverImageUrl,
		coverFileKey,
		containsSpoilers,
	]);

	// Debounced auto-save on content changes
	useEffect(() => {
		if (!title.trim() || rating === 0 || initialLoadRef.current) return;

		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		setSaveStatus("idle");
		saveTimeoutRef.current = setTimeout(() => {
			autoSave();
		}, 2000);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [title, rating, autoSave]);

	const handleCoverUpload = (url: string, fileKey: string) => {
		setCoverImageUrl(url);
		setCoverFileKey(fileKey);
	};

	const handleCoverRemove = () => {
		setCoverImageUrl(null);
		setCoverFileKey(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !title.trim() || !content.trim() || rating === 0) return;

		setIsSubmitting(true);
		try {
			await updateReview({
				data: {
					reviewId: id,
					title,
					content,
					rating,
					coverImageUrl: coverImageUrl || undefined,
					coverFileKey: coverFileKey || undefined,
					containsSpoilers,
					published: true,
					clerkId: user.id,
				},
			});

			toast.success("Review updated");
			navigate({ to: "/reviews/$id", params: { id } });
		} catch (error) {
			console.error("Failed to update review:", error);
			toast.error("Failed to update review");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Sign in to edit this review
					</h1>
					<Link to="/sign-in" className="text-purple-400 hover:underline">
						Sign In
					</Link>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<Toaster position="top-right" theme="dark" />

			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="flex items-center justify-between mb-6">
					<Link
						to="/reviews/$id"
						params={{ id }}
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
					>
						<ArrowLeft size={20} />
						Back to Review
					</Link>

					{/* Save status indicator */}
					<div className="flex items-center gap-2 text-sm">
						{saveStatus === "saving" && (
							<>
								<Cloud className="text-gray-400 animate-pulse" size={16} />
								<span className="text-gray-400">Saving...</span>
							</>
						)}
						{saveStatus === "saved" && lastSaved && (
							<>
								<Save className="text-green-400" size={16} />
								<span className="text-green-400">
									Saved {lastSaved.toLocaleTimeString()}
								</span>
							</>
						)}
					</div>
				</div>

				<h1 className="text-3xl font-bold text-white mb-8">Edit Review</h1>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Game (read-only) */}
					{game && (
						<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4">
							{game.coverUrl ? (
								<img
									src={game.coverUrl}
									alt=""
									className="w-16 h-20 object-cover rounded"
								/>
							) : (
								<div className="w-16 h-20 bg-gray-700 rounded flex items-center justify-center">
									<Gamepad2 className="w-8 h-8 text-gray-500" />
								</div>
							)}
							<div className="flex-1">
								<p className="text-sm text-gray-400">Reviewing</p>
								<Link
									to="/games/$slug"
									params={{ slug: game.slug }}
									className="text-lg font-semibold text-white hover:text-purple-400"
								>
									{game.name}
								</Link>
							</div>
						</div>
					)}

					{/* Cover Image */}
					<CoverImageUpload
						currentUrl={coverImageUrl}
						onUpload={handleCoverUpload}
						onRemove={handleCoverRemove}
						uploadEndpoint="reviewCover"
					/>

					{/* Rating */}
					<div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
						<span className="block text-sm font-medium text-gray-300 mb-4">
							Your Rating
						</span>
						<StarRating
							rating={rating}
							size="lg"
							interactive
							onChange={setRating}
						/>
					</div>

					{/* Title */}
					<div>
						<label
							htmlFor={`${formId}-title`}
							className="block text-sm font-medium text-gray-300 mb-2"
						>
							Review Title
						</label>
						<input
							id={`${formId}-title`}
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Give your review a title..."
							className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
							required
						/>
					</div>

					{/* Spoiler Toggle */}
					<SpoilerToggle
						checked={containsSpoilers}
						onChange={setContainsSpoilers}
					/>

					{/* Content - Rich Text Editor */}
					<div>
						<span className="block text-sm font-medium text-gray-300 mb-2">
							Your Review
						</span>
						<RichTextEditor
							content={content}
							onChange={setContent}
							placeholder="Write your thoughts about this game..."
							uploadEndpoint="reviewInlineImage"
						/>
					</div>

					<div className="flex gap-4">
						<Link
							to="/reviews/$id"
							params={{ id }}
							className="flex-1 py-3 text-center bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
						>
							Cancel
						</Link>
						<button
							type="submit"
							disabled={isSubmitting || rating === 0}
							className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
