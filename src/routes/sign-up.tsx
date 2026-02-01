import { SignUp } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import guidelinesMd from "../../user_guideline.md?raw";

export const Route = createFileRoute("/sign-up")({
	component: SignUpPage,
});

const firstLine = guidelinesMd.split("\n")[0];
const dateStr = firstLine?.split(" - ")[1]?.trim();
const now = new Date();
const currentMonthYear = now.toLocaleString("default", {
	month: "long",
	year: "numeric",
});

const isNew = dateStr === currentMonthYear;

function SignUpPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
			<div className="w-full max-w-md p-4">
				<SignUp
					appearance={{
						elements: {
							rootBox: "mx-auto",
							card: "bg-gray-800/80 backdrop-blur-xl border border-gray-700 shadow-2xl",
							headerTitle: "text-white",
							headerSubtitle: "text-gray-400",
							socialButtonsBlockButton:
								"bg-gray-700 border-gray-600 text-white hover:bg-gray-600",
							formFieldLabel: "text-gray-300",
							formFieldInput:
								"bg-gray-700 border-gray-600 text-white placeholder:text-gray-400",
							footerActionLink: "text-purple-400 hover:text-purple-300",
							formButtonPrimary:
								"bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
						},
					}}
					signInUrl="/sign-in"
					forceRedirectUrl="/"
				/>
				<div className="mt-4 text-center">
					<Link
						to="/guidelines"
						className="text-gray-400 hover:text-white text-sm transition-colors relative inline-flex items-center gap-2"
					>
						Community Guidelines
						{isNew && (
							<span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-lg shadow-purple-500/20">
								NEW
							</span>
						)}
					</Link>
				</div>
			</div>
		</div>
	);
}
