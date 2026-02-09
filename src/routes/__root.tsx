import { useAuth, useUser } from "@clerk/clerk-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ConvexReactClient, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import Header from "../components/Header";
import ClerkProvider from "../integrations/clerk/provider";

import appCss from "../styles.css?url";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Component to sync user with database when signed in
function UserSync() {
	const { user, isSignedIn } = useUser();
	const syncUserMutation = useMutation(api.users.syncUser);

	useEffect(() => {
		if (isSignedIn && user) {
			syncUserMutation({
				clerkId: user.id,
				email: user.primaryEmailAddress?.emailAddress || "",
				username: user.username || user.id,
				displayName: undefined,
				avatarUrl: user.imageUrl || undefined,
			}).catch(console.error);
		}
	}, [isSignedIn, user, syncUserMutation]);

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
			{
				property: "og:site_name",
				content: "Think Ribbon",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				name: "twitter:card",
				content: "summary",
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
					<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
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
					</ConvexProviderWithClerk>
				</ClerkProvider>
				<Scripts />
			</body>
		</html>
	);
}
