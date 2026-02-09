import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Edit, FileText, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Toaster, toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/drafts/")({
	component: DraftsPage,
});

function DraftsPage() {
	const navigate = useNavigate();
	const { user, isSignedIn } = useUser();
	const draftsData = useQuery(
		api.drafts.getAllDrafts,
		user?.id ? { clerkId: user.id } : "skip",
	);
	const articleDrafts = draftsData?.articleDrafts ?? [];
	const reviewDrafts = draftsData?.reviewDrafts ?? [];
	const isLoading = user && draftsData === undefined;
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const deleteArticleDraftMut = useMutation(api.drafts.deleteArticleDraft);
	const deleteReviewDraftMut = useMutation(api.drafts.deleteReviewDraft);

	const handleDeleteArticleDraft = async (draftId: string) => {
		if (!user) return;
		setDeletingId(draftId);
		try {
			await deleteArticleDraftMut({
				draftId: draftId as Id<"articleDrafts">,
				clerkId: user.id,
			});
			toast.success("Draft deleted");
		} catch (error) {
			console.error("Failed to delete draft:", error);
			toast.error("Failed to delete draft");
		} finally {
			setDeletingId(null);
		}
	};

	const handleDeleteReviewDraft = async (draftId: string) => {
		if (!user) return;
		setDeletingId(draftId);
		try {
			await deleteReviewDraftMut({
				draftId: draftId as Id<"reviewDrafts">,
				clerkId: user.id,
			});
			toast.success("Draft deleted");
		} catch (error) {
			console.error("Failed to delete draft:", error);
			toast.error("Failed to delete draft");
		} finally {
			setDeletingId(null);
		}
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Sign in to view your drafts
					</h1>
					<Link to="/sign-in" className="text-slate-400 hover:underline">
						Sign In
					</Link>
				</div>
			</div>
		);
	}

	const totalDrafts = articleDrafts.length + reviewDrafts.length;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-800/20">
			<Toaster position="top-right" theme="dark" />

			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
				>
					<ArrowLeft size={20} />
					Back
				</Link>

				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-white flex items-center gap-3">
						<FileText className="text-slate-400" />
						My Drafts
					</h1>
					<span className="text-gray-400">
						{totalDrafts} draft{totalDrafts !== 1 ? "s" : ""} (max 10 each)
					</span>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : totalDrafts === 0 ? (
					<div className="text-center py-12">
						<FileText className="mx-auto mb-4 text-gray-600" size={48} />
						<h2 className="text-xl font-semibold text-white mb-2">
							No drafts yet
						</h2>
						<p className="text-gray-400 mb-6">
							Start writing an article or review and your progress will be saved
							automatically.
						</p>
						<div className="flex items-center justify-center gap-4">
							<Link
								to="/articles/new"
								search={{ draftId: undefined }}
								className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								Write Article
							</Link>
							<Link
								to="/reviews/new"
								search={{ gameId: undefined, draftId: undefined }}
								className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
							>
								Write Review
							</Link>
						</div>
					</div>
				) : (
					<div className="space-y-8">
						{/* Article Drafts */}
						{articleDrafts.length > 0 && (
							<section>
								<h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
									<Edit size={20} className="text-slate-400" />
									Article Drafts ({articleDrafts.length})
								</h2>
								<div className="space-y-3">
									{articleDrafts.map((draft) => (
										<DraftCard
											key={draft._id}
											title={draft.title || "Untitled Article"}
											updatedAt={draft.updatedAt ?? draft._creationTime}
											type="article"
											isDeleting={deletingId === draft._id}
											onEdit={() =>
												navigate({
													to: "/articles/new",
													search: { draftId: draft._id },
												})
											}
											onDelete={() => handleDeleteArticleDraft(draft._id)}
										/>
									))}
								</div>
							</section>
						)}

						{/* Review Drafts */}
						{reviewDrafts.length > 0 && (
							<section>
								<h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
									<Star size={20} className="text-yellow-400" />
									Review Drafts ({reviewDrafts.length})
								</h2>
								<div className="space-y-3">
									{reviewDrafts.map((draft) => (
										<DraftCard
											key={draft._id}
											title={draft.title || "Untitled Review"}
											subtitle={
												draft.rating ? `${draft.rating}/5 stars` : undefined
											}
											updatedAt={draft.updatedAt ?? draft._creationTime}
											type="review"
											isDeleting={deletingId === draft._id}
											onEdit={() =>
												navigate({
													to: "/reviews/new",
													search: { gameId: undefined, draftId: draft._id },
												})
											}
											onDelete={() => handleDeleteReviewDraft(draft._id)}
										/>
									))}
								</div>
							</section>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

interface DraftCardProps {
	title: string;
	subtitle?: string;
	updatedAt: number | Date | string;
	type: "article" | "review";
	isDeleting: boolean;
	onEdit: () => void;
	onDelete: () => void;
}

function DraftCard({
	title,
	subtitle,
	updatedAt,
	type,
	isDeleting,
	onEdit,
	onDelete,
}: DraftCardProps) {
	const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

	return (
		<div className="flex items-center gap-4 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:border-gray-600/50 transition-colors">
			<div
				className={`p-2 rounded-lg ${
					type === "article" ? "bg-slate-500/20" : "bg-yellow-500/20"
				}`}
			>
				{type === "article" ? (
					<Edit className="text-slate-400" size={20} />
				) : (
					<Star className="text-yellow-400" size={20} />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<h3 className="text-white font-medium truncate">{title}</h3>
				<p className="text-sm text-gray-500">
					{subtitle && <span className="text-gray-400">{subtitle} • </span>}
					Last edited {date.toLocaleDateString()} at{" "}
					{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
				</p>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onEdit}
					className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
				>
					Continue
				</button>
				<button
					type="button"
					onClick={onDelete}
					disabled={isDeleting}
					className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
				>
					{isDeleting ? (
						<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
					) : (
						<Trash2 size={18} />
					)}
				</button>
			</div>
		</div>
	);
}
