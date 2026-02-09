import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Report {
	_id: Id<"reports">;
	reporterId: Id<"users">;
	targetType: "post" | "article" | "review" | "user";
	targetId: string;
	message: string;
	createdAt: number;
	reporter: {
		_id: Id<"users">;
		username: string;
		displayName?: string;
		avatarUrl?: string;
	} | null;
	targetPreview: {
		authorUsername?: string;
		title?: string;
		content?: string;
	};
}

interface CompletedReport {
	_id: Id<"completedReports">;
	reporterId: Id<"users">;
	targetType: "post" | "article" | "review" | "user";
	targetId: string;
	message: string;
	createdAt: number;
	addressedById: Id<"users">;
	addressedAt: number;
	reporter: {
		_id: Id<"users">;
		username: string;
		displayName?: string;
		avatarUrl?: string;
	} | null;
	addressedBy: {
		_id: Id<"users">;
		username: string;
		displayName?: string;
	} | null;
	targetPreview: {
		authorUsername?: string;
		title?: string;
		content?: string;
	};
}

interface ReportsTableProps {
	reports: Report[];
	showResolveButton?: boolean;
}

interface CompletedReportsTableProps {
	reports: CompletedReport[];
}

function getContentLink(
	targetType: "post" | "article" | "review" | "user",
	targetId: string,
	targetPreview?: { authorUsername?: string; title?: string; content?: string },
): string {
	switch (targetType) {
		case "post":
			return `/posts/${targetId}`;
		case "article":
			return `/articles/${targetId}`;
		case "review":
			return `/reviews/${targetId}`;
		case "user":
			return `/profile/${targetPreview?.authorUsername ?? targetId}`;
	}
}

export function ReportsTable({
	reports,
	showResolveButton = true,
}: ReportsTableProps) {
	const { user } = useUser();
	const [resolvingId, setResolvingId] = useState<Id<"reports"> | null>(null);
	const resolveMutation = useMutation(api.reports.resolve);

	const handleResolve = async (reportId: Id<"reports">) => {
		if (!user) return;
		setResolvingId(reportId);
		try {
			await resolveMutation({ reportId, clerkId: user.id });
		} finally {
			setResolvingId(null);
		}
	};

	if (reports.length === 0) {
		return (
			<div className="text-center text-gray-500 py-12">No pending reports.</div>
		);
	}

	return (
		<div className="space-y-4">
			{reports.map((report) => (
				<div
					key={report._id}
					className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
				>
					<div className="flex items-start justify-between gap-4 mb-3">
						<div className="flex items-center gap-3">
							{report.reporter && (
								<Link
									to="/profile/$username"
									params={{ username: report.reporter.username }}
									className="flex items-center gap-2 hover:text-slate-400 transition-colors"
								>
									<div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden">
										{report.reporter.avatarUrl ? (
											<img
												src={report.reporter.avatarUrl}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<span className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
												{(report.reporter.displayName ||
													report.reporter.username)[0].toUpperCase()}
											</span>
										)}
									</div>
									<span className="text-white font-medium">
										{report.reporter.displayName || report.reporter.username}
									</span>
								</Link>
							)}
							<span className="text-gray-500 text-sm">
								{formatDistanceToNow(new Date(report.createdAt))} ago
							</span>
						</div>
						<span className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-400 uppercase">
							{report.targetType}
						</span>
					</div>

					<div className="mb-3">
						<p className="text-gray-400 text-sm mb-2">Reported content:</p>
						<div className="bg-gray-900/50 rounded-lg p-3 flex items-start justify-between gap-4">
							<div className="flex-1 min-w-0">
								{report.targetPreview.authorUsername && (
									<p className="text-gray-500 text-xs mb-1">
										by @{report.targetPreview.authorUsername}
									</p>
								)}
								{report.targetPreview.title ? (
									<p className="text-white truncate">
										{report.targetPreview.title}
									</p>
								) : report.targetPreview.content ? (
									<p className="text-white text-sm">
										{report.targetPreview.content}
										{report.targetPreview.content.length >= 100 && "..."}
									</p>
								) : (
									<p className="text-gray-500 italic">[Content unavailable]</p>
								)}
							</div>
							<Link
								to={getContentLink(
									report.targetType,
									report.targetId,
									report.targetPreview,
								)}
								className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
							>
								<ExternalLink size={16} />
							</Link>
						</div>
					</div>

					<div className="mb-4">
						<p className="text-gray-400 text-sm mb-1">Report reason:</p>
						<p className="text-white">{report.message}</p>
					</div>

					{showResolveButton && (
						<button
							type="button"
							onClick={() => handleResolve(report._id)}
							disabled={resolvingId === report._id}
							className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
						>
							{resolvingId === report._id ? (
								<>
									<Loader2 size={16} className="animate-spin" />
									Resolving...
								</>
							) : (
								<>
									<Check size={16} />
									Mark as Resolved
								</>
							)}
						</button>
					)}
				</div>
			))}
		</div>
	);
}

export function CompletedReportsTable({ reports }: CompletedReportsTableProps) {
	if (reports.length === 0) {
		return (
			<div className="text-center text-gray-500 py-12">
				No resolved reports.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{reports.map((report) => (
				<div
					key={report._id}
					className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
				>
					<div className="flex items-start justify-between gap-4 mb-3">
						<div className="flex items-center gap-3">
							{report.reporter && (
								<Link
									to="/profile/$username"
									params={{ username: report.reporter.username }}
									className="flex items-center gap-2 hover:text-slate-400 transition-colors"
								>
									<div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 overflow-hidden">
										{report.reporter.avatarUrl ? (
											<img
												src={report.reporter.avatarUrl}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<span className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
												{(report.reporter.displayName ||
													report.reporter.username)[0].toUpperCase()}
											</span>
										)}
									</div>
									<span className="text-white font-medium">
										{report.reporter.displayName || report.reporter.username}
									</span>
								</Link>
							)}
							<span className="text-gray-500 text-sm">
								{formatDistanceToNow(new Date(report.createdAt))} ago
							</span>
						</div>
						<span className="px-2 py-1 bg-green-500/20 rounded text-xs text-green-400 uppercase">
							Resolved
						</span>
					</div>

					<div className="mb-3">
						<p className="text-gray-400 text-sm mb-2">Reported content:</p>
						<div className="bg-gray-900/50 rounded-lg p-3 flex items-start justify-between gap-4">
							<div className="flex-1 min-w-0">
								{report.targetPreview.authorUsername && (
									<p className="text-gray-500 text-xs mb-1">
										by @{report.targetPreview.authorUsername}
									</p>
								)}
								{report.targetPreview.title ? (
									<p className="text-white truncate">
										{report.targetPreview.title}
									</p>
								) : report.targetPreview.content ? (
									<p className="text-white text-sm">
										{report.targetPreview.content}
										{report.targetPreview.content.length >= 100 && "..."}
									</p>
								) : (
									<p className="text-gray-500 italic">[Content unavailable]</p>
								)}
							</div>
							<Link
								to={getContentLink(
									report.targetType,
									report.targetId,
									report.targetPreview,
								)}
								className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
							>
								<ExternalLink size={16} />
							</Link>
						</div>
					</div>

					<div className="mb-3">
						<p className="text-gray-400 text-sm mb-1">Report reason:</p>
						<p className="text-white">{report.message}</p>
					</div>

					<div className="text-sm text-gray-500">
						Resolved by{" "}
						<span className="text-gray-300">
							{report.addressedBy?.displayName || report.addressedBy?.username}
						</span>{" "}
						{formatDistanceToNow(new Date(report.addressedAt))} ago
					</div>
				</div>
			))}
		</div>
	);
}
