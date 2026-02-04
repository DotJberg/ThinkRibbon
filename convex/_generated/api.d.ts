/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articles from "../articles.js";
import type * as cleanup from "../cleanup.js";
import type * as collections from "../collections.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as drafts from "../drafts.js";
import type * as feed from "../feed.js";
import type * as games from "../games.js";
import type * as igdb from "../igdb.js";
import type * as images from "../images.js";
import type * as likes from "../likes.js";
import type * as linkPreviews from "../linkPreviews.js";
import type * as migrations_migrateCompletedToBeaten from "../migrations/migrateCompletedToBeaten.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as questlog from "../questlog.js";
import type * as reports from "../reports.js";
import type * as reviews from "../reviews.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articles: typeof articles;
  cleanup: typeof cleanup;
  collections: typeof collections;
  comments: typeof comments;
  crons: typeof crons;
  drafts: typeof drafts;
  feed: typeof feed;
  games: typeof games;
  igdb: typeof igdb;
  images: typeof images;
  likes: typeof likes;
  linkPreviews: typeof linkPreviews;
  "migrations/migrateCompletedToBeaten": typeof migrations_migrateCompletedToBeaten;
  notifications: typeof notifications;
  posts: typeof posts;
  questlog: typeof questlog;
  reports: typeof reports;
  reviews: typeof reviews;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
