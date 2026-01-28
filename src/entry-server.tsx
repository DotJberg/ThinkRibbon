import { createClerkHandler } from "@clerk/tanstack-start/server";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { getRouter } from "./router";

const handler = createStartHandler({
	createRouter: getRouter,
	getRouterManifest: () => {
		return import("./routeTree.gen").then((d) => d.routeTree);
	},
} as any);

// @ts-expect-error - mismatch in beta types
export default createClerkHandler(handler)(defaultStreamHandler);
