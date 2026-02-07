import { useAuth } from "@clerk/clerk-react";
import { RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createRoot } from "react-dom/client";
import ClerkProvider from "./integrations/clerk/provider";
import { getRouter } from "./router";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const router = getRouter();

function App() {
	return (
		<ClerkProvider>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<RouterProvider router={router} />
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<App />);
}
