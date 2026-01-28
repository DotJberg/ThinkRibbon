import { useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { FileText, Gamepad2, Home, Menu, Star, User, X } from "lucide-react";
import { useState } from "react";
import ClerkHeader from "../integrations/clerk/header-user.tsx";

export default function Header() {
	const { user, isSignedIn } = useUser();
	const [isOpen, setIsOpen] = useState(false);

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
						<div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
							<Gamepad2 size={18} className="text-white" />
						</div>
						<span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hidden sm:inline">
							ThinkRibbon
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
					{isSignedIn && (
						<>
							<Link
								to="/reviews/new"
								search={{ gameId: undefined }}
								className="text-gray-300 hover:text-white transition-colors font-medium"
								activeProps={{ className: "text-white font-medium" }}
							>
								Write Review
							</Link>
							<Link
								to="/articles/new"
								className="text-gray-300 hover:text-white transition-colors font-medium"
								activeProps={{ className: "text-white font-medium" }}
							>
								Write Article
							</Link>
						</>
					)}
				</nav>

				<div className="flex items-center gap-3">
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
						<div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
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
								"flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors mb-2",
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
								"flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors mb-2",
						}}
					>
						<Gamepad2 size={20} />
						<span className="font-medium">Browse Games</span>
					</Link>

					{isSignedIn && (
						<>
							<div className="border-t border-gray-800 my-4" />
							<p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">
								Create
							</p>

							<Link
								to="/reviews/new"
								search={{ gameId: undefined }}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors mb-2",
								}}
							>
								<Star size={20} />
								<span className="font-medium">Write Review</span>
							</Link>

							<Link
								to="/articles/new"
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors mb-2",
								}}
							>
								<FileText size={20} />
								<span className="font-medium">Write Article</span>
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
						</>
					)}
				</nav>

				<div className="p-4 border-t border-gray-800 bg-gray-800/50">
					<ClerkHeader />
				</div>
			</aside>
		</>
	);
}
