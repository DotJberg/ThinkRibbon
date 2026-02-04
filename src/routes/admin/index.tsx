import { useUser } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
	CompletedReportsTable,
	ReportsTable,
} from "../../components/admin/ReportsTable";

export const Route = createFileRoute("/admin/")({
	component: AdminPage,
});

function AdminPage() {
	const { user, isSignedIn, isLoaded } = useUser();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");

	const isAdmin = useQuery(
		api.users.isAdmin,
		user?.id ? { clerkId: user.id } : "skip",
	);

	const pendingReports = useQuery(
		api.reports.getAll,
		user?.id && isAdmin ? { clerkId: user.id } : "skip",
	);

	const completedReports = useQuery(
		api.reports.getCompleted,
		user?.id && isAdmin ? { clerkId: user.id } : "skip",
	);

	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			navigate({ to: "/" });
		}
	}, [isLoaded, isSignedIn, navigate]);

	useEffect(() => {
		if (isAdmin === false) {
			navigate({ to: "/" });
		}
	}, [isAdmin, navigate]);

	if (!isLoaded || isAdmin === undefined) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20 flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!isAdmin) {
		return null;
	}

	const pendingCount = pendingReports?.length ?? 0;
	const resolvedCount = completedReports?.length ?? 0;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="flex items-center gap-3 mb-8">
					<div className="p-2 bg-purple-500/20 rounded-lg">
						<Shield className="text-purple-400" size={24} />
					</div>
					<h1 className="text-3xl font-bold text-white">Admin Panel</h1>
				</div>

				<div className="flex gap-4 mb-6">
					<button
						type="button"
						onClick={() => setActiveTab("pending")}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
							activeTab === "pending"
								? "bg-purple-600 text-white"
								: "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
						}`}
					>
						<AlertTriangle size={18} />
						Pending Reports
						{pendingCount > 0 && (
							<span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
								{pendingCount}
							</span>
						)}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("resolved")}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
							activeTab === "resolved"
								? "bg-purple-600 text-white"
								: "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
						}`}
					>
						<CheckCircle size={18} />
						Resolved Reports
						{resolvedCount > 0 && (
							<span className="px-2 py-0.5 bg-gray-600/50 text-gray-400 rounded-full text-xs font-bold">
								{resolvedCount}
							</span>
						)}
					</button>
				</div>

				{activeTab === "pending" ? (
					<ReportsTable reports={pendingReports ?? []} />
				) : (
					<CompletedReportsTable reports={completedReports ?? []} />
				)}
			</div>
		</div>
	);
}
