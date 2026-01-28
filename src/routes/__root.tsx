import { useUser } from "@clerk/clerk-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import Header from "../components/Header";

import ClerkProvider from "../integrations/clerk/provider";
import { syncUser } from "../lib/server/users";

import appCss from "../styles.css?url";

// Component to sync user with database when signed in
function UserSync() {
	const { user, isSignedIn } = useUser();

	useEffect(() => {
		if (isSignedIn && user) {
			syncUser({
				data: {
					clerkId: user.id,
					email: user.primaryEmailAddress?.emailAddress || "",
					username: user.username || user.id,
					displayName: user.fullName || undefined,
					avatarUrl: user.imageUrl || undefined,
				},
			}).catch(console.error);
		}
	}, [isSignedIn, user]);

	return null;
}

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Think Ribbon",
			},
			{
				name: "description",
				content:
					"A video game social platform for reviews, articles, and community.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ClerkProvider>
					<UserSync />
					<Header />
					{children}
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				</ClerkProvider>
				<Scripts />
			</body>
		</html>
	);
}
