import {
	SignedIn,
	SignedOut,
	SignInButton,
	useClerk,
	useUser,
} from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { LogOut, Package, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";

export default function HeaderUser() {
	const { user } = useUser();
	const { signOut, openUserProfile } = useClerk();
	const dbUser = useQuery(
		api.users.getByClerkId,
		user?.id ? { clerkId: user.id } : "skip",
	);
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Use database avatar if available, otherwise fall back to Clerk avatar
	const avatarUrl = dbUser?.avatarUrl || user?.imageUrl;
	const initials = (user?.firstName || user?.username || "U")[0].toUpperCase();
	const username = user?.username || user?.id || "";

	return (
		<>
			<SignedIn>
				<div className="relative" ref={dropdownRef}>
					{/* Avatar button */}
					<button
						type="button"
						onClick={() => setIsOpen(!isOpen)}
						className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-500 hover:ring-2 hover:ring-slate-400 transition-all cursor-pointer"
					>
						{avatarUrl ? (
							<img
								src={avatarUrl}
								alt="Profile"
								className="w-full h-full object-cover"
							/>
						) : (
							<span className="w-full h-full flex items-center justify-center text-sm text-white font-bold">
								{initials}
							</span>
						)}
					</button>

					{/* Dropdown menu */}
					{isOpen && (
						<div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
							<Link
								to="/profile/$username"
								params={{ username }}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
							>
								<User size={18} />
								<span>My Profile</span>
							</Link>
							<Link
								to="/collection/$username"
								params={{ username }}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
							>
								<Package size={18} />
								<span>My Collection</span>
							</Link>
							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									openUserProfile();
								}}
								className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
							>
								<Settings size={18} />
								<span>Manage Account</span>
							</button>
							<div className="border-t border-gray-700" />
							<button
								type="button"
								onClick={() => signOut()}
								className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
							>
								<LogOut size={18} />
								<span>Sign Out</span>
							</button>
						</div>
					)}
				</div>
			</SignedIn>
			<SignedOut>
				<SignInButton />
			</SignedOut>
		</>
	);
}
