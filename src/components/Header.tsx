import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	BookOpen,
	ChevronDown,
	FileText,
	Gamepad2,
	Home,
	Menu,
	Shield,
	Star,
	User,
	Users,
	X,
	Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import guidelinesMd from "../../user_guideline.md?raw";
import ClerkHeader from "../integrations/clerk/header-user.tsx";
import NotificationBell from "./NotificationBell.tsx";
import { QuickReviewModal } from "./shared/QuickReviewModal";

const firstLine = guidelinesMd.split("\n")[0];
const dateStr = firstLine?.split(" - ")[1]?.trim();
const now = new Date();
const currentMonthYear = now.toLocaleString("default", {
	month: "long",
	year: "numeric",
});

const isNew = dateStr === currentMonthYear;

export default function Header() {
	const { user, isSignedIn } = useUser();
	const [isOpen, setIsOpen] = useState(false);
	const [reviewDropdownOpen, setReviewDropdownOpen] = useState(false);
	const [quickReviewModalOpen, setQuickReviewModalOpen] = useState(false);
	const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isAdmin = useQuery(
		api.users.isAdmin,
		user?.id ? { clerkId: user.id } : "skip",
	);

	const hasPendingReports = useQuery(
		api.reports.hasPending,
		isAdmin && user?.id ? { clerkId: user.id } : "skip",
	);

	return (
		<>
			<header className="p-4 flex items-center justify-between bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 text-white sticky top-0 z-40">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="p-2 hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
						aria-label="Open menu"
					>
						<Menu size={24} />
					</button>
					<Link to="/" className="flex items-center gap-2">
						<div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-500 rounded-lg flex items-center justify-center">
							<Gamepad2 size={18} className="text-white" />
						</div>
						<span className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent hidden sm:inline">
							Think Ribbon
						</span>
					</Link>
				</div>

				{/* Desktop Navigation */}
				<nav className="hidden lg:flex items-center gap-6">
					<Link
						to="/"
						className="text-gray-300 hover:text-white transition-colors font-medium"
						activeProps={{ className: "text-white font-medium" }}
					>
						Feed
					</Link>
					<Link
						to="/games"
						className="text-gray-300 hover:text-white transition-colors font-medium"
						activeProps={{ className: "text-white font-medium" }}
					>
						Games
					</Link>
					<Link
						to="/users"
						className="text-gray-300 hover:text-white transition-colors font-medium"
						activeProps={{ className: "text-white font-medium" }}
					>
						People
					</Link>

					{isSignedIn && (
						<>
							{/* biome-ignore lint/a11y/noStaticElementInteractions: hover dropdown trigger */}
							<div
								className="relative"
								onMouseEnter={() => {
									if (dropdownTimeoutRef.current) {
										clearTimeout(dropdownTimeoutRef.current);
									}
									setReviewDropdownOpen(true);
								}}
								onMouseLeave={() => {
									dropdownTimeoutRef.current = setTimeout(() => {
										setReviewDropdownOpen(false);
									}, 150);
								}}
							>
								<span className="text-gray-300 hover:text-white transition-colors font-medium cursor-default flex items-center gap-1">
									New Review
									<ChevronDown
										size={14}
										className={`transition-transform ${reviewDropdownOpen ? "rotate-180" : ""}`}
									/>
								</span>
								{reviewDropdownOpen && (
									<div className="absolute top-full left-0 pt-2">
										<div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[180px]">
											<Link
												to="/drafts"
												onClick={() => setReviewDropdownOpen(false)}
												className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
											>
												<FileText size={16} />
												Open a Draft
											</Link>
											<Link
												to="/reviews/new"
												search={{
													gameId: undefined,
													draftId: undefined,
												}}
												onClick={() => setReviewDropdownOpen(false)}
												className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
											>
												<Star size={16} />
												Full Review
											</Link>
											<button
												type="button"
												onClick={() => {
													setReviewDropdownOpen(false);
													setQuickReviewModalOpen(true);
												}}
												className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
											>
												<Zap size={16} />
												Quick Review
											</button>
										</div>
									</div>
								)}
							</div>
							<Link
								to="/articles/new"
								search={{ draftId: undefined }}
								className="text-gray-300 hover:text-white transition-colors font-medium"
								activeProps={{ className: "text-white font-medium" }}
							>
								New Article
							</Link>
							{isAdmin && (
								<Link
									to="/admin"
									className="text-gray-300 hover:text-white transition-colors font-medium relative"
									activeProps={{
										className: "text-white font-medium relative",
									}}
								>
									Admin
									{hasPendingReports && (
										<span className="absolute -top-1 -right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
									)}
								</Link>
							)}
						</>
					)}
					<Link
						to="/guidelines"
						className="text-gray-300 hover:text-white transition-colors font-medium flex items-center gap-1.5"
						activeProps={{
							className: "text-white font-medium flex items-center gap-1.5",
						}}
					>
						Guidelines
						{isNew && (
							<span className="bg-gradient-to-r from-red-500 to-red-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full animate-pulse">
								NEW
							</span>
						)}
					</Link>
				</nav>

				<div className="flex items-center gap-3">
					{isSignedIn && <NotificationBell />}
					<ClerkHeader />
				</div>
			</header>

			{/* Mobile Sidebar */}
			{isOpen && (
				<button
					type="button"
					className="fixed inset-0 bg-black/50 z-50 lg:hidden w-full h-full border-0 cursor-default"
					onClick={() => setIsOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") setIsOpen(false);
					}}
					aria-label="Close menu overlay"
				/>
			)}
			<aside
				className={`fixed top-0 left-0 h-full w-72 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col lg:hidden ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-4 border-b border-gray-800">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-500 rounded-lg flex items-center justify-center">
							<Gamepad2 size={18} className="text-white" />
						</div>
						<span className="font-bold text-lg">Menu</span>
					</div>
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
						aria-label="Close menu"
					>
						<X size={24} />
					</button>
				</div>

				<nav className="flex-1 p-4 overflow-y-auto">
					<Link
						to="/"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-800 transition-colors mb-2",
						}}
					>
						<Home size={20} />
						<span className="font-medium">Home</span>
					</Link>

					<Link
						to="/games"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-800 transition-colors mb-2",
						}}
					>
						<Gamepad2 size={20} />
						<span className="font-medium">Browse Games</span>
					</Link>

					<Link
						to="/users"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-800 transition-colors mb-2",
						}}
					>
						<Users size={20} />
						<span className="font-medium">Find People</span>
					</Link>

					{isSignedIn && (
						<>
							<div className="border-t border-gray-800 my-4" />
							<p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">
								Create
							</p>

							<Link
								to="/drafts"
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 pl-6 rounded-lg hover:bg-gray-800 transition-colors mb-2"
							>
								<FileText size={20} />
								<span className="font-medium">Open a Draft</span>
							</Link>

							<Link
								to="/reviews/new"
								search={{ gameId: undefined, draftId: undefined }}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 pl-6 rounded-lg hover:bg-gray-800 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 pl-6 rounded-lg bg-slate-700 hover:bg-slate-800 transition-colors mb-2",
								}}
							>
								<Star size={20} />
								<span className="font-medium">Full Review</span>
							</Link>

							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									setQuickReviewModalOpen(true);
								}}
								className="w-full flex items-center gap-3 p-3 pl-6 rounded-lg hover:bg-gray-800 transition-colors mb-2"
							>
								<Zap size={20} />
								<span className="font-medium">Quick Review</span>
							</button>

							<Link
								to="/articles/new"
								search={{ draftId: undefined }}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-800 transition-colors mb-2",
								}}
							>
								<FileText size={20} />
								<span className="font-medium">New Article</span>
							</Link>

							<div className="border-t border-gray-800 my-4" />

							<Link
								to="/profile/$username"
								params={{ username: user?.username || user?.id || "" }}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
							>
								<User size={20} />
								<span className="font-medium">My Profile</span>
							</Link>

							{isAdmin && (
								<Link
									to="/admin"
									onClick={() => setIsOpen(false)}
									className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
									activeProps={{
										className:
											"flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-800 transition-colors mb-2",
									}}
								>
									<div className="relative">
										<Shield size={20} />
										{hasPendingReports && (
											<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
										)}
									</div>
									<span className="font-medium">Admin Panel</span>
								</Link>
							)}
						</>
					)}
					<Link
						to="/guidelines"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-800 transition-colors mb-2",
						}}
					>
						<BookOpen size={20} />
						<div className="flex items-center gap-2">
							<span className="font-medium">Guidelines</span>
							{isNew && (
								<span className="bg-gradient-to-r from-red-500 to-red-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/20">
									NEW
								</span>
							)}
						</div>
					</Link>
				</nav>

				<div className="p-4 border-t border-gray-800 bg-gray-800/50 flex items-center gap-3">
					{isSignedIn && <NotificationBell />}
					<ClerkHeader />
				</div>
			</aside>

			<QuickReviewModal
				isOpen={quickReviewModalOpen}
				onClose={() => setQuickReviewModalOpen(false)}
			/>
		</>
	);
}
