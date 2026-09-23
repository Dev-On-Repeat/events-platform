import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  queueJoin: {
    kind: "fixed window",
    rate: 10, // 10 joins per minute
    period: 1 * MINUTE,
  },
  registration: {
    kind: "fixed window",
    rate: 10, // 10 attempts per minute
    period: 1 * MINUTE,
  },
  paymentAttempt: {
    kind: "fixed window",
    rate: 15, // 15 attempts per minute
    period: 1 * MINUTE,
  },
  ticketCheckIn: {
    kind: "fixed window",
    rate: 60, // 60 scans per minute for staff
    period: 1 * MINUTE,
  },
});
