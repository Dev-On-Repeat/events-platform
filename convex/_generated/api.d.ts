/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as payments from "../payments.js";
import type * as queue from "../queue.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as registrations from "../registrations.js";
import type * as tickets from "../tickets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  constants: typeof constants;
  crons: typeof crons;
  events: typeof events;
  payments: typeof payments;
  queue: typeof queue;
  rateLimiter: typeof rateLimiter;
  registrations: typeof registrations;
  tickets: typeof tickets;
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

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
