import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { getRouter } from "./router";
import { createClerkHandler } from "@clerk/tanstack-start/server";

// @ts-ignore - mismatch in beta types
const handler = createStartHandler({
  createRouter: getRouter,
  getRouterManifest: () => {
    return import("./routeTree.gen").then((d) => d.routeTree);
  },
});

// @ts-ignore - mismatch in beta types
export default createClerkHandler(handler)(defaultStreamHandler);
