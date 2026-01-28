import { SignUp } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up")({
	component: SignUpPage,
});

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
			</div>
		</div>
	);
}
