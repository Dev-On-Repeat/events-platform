import { ConvexHttpClient } from "convex/browser";

let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  let url = process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210";
  if (url.includes("mock-demo") || url.includes("mock-convex")) {
    url = "http://127.0.0.1:3210";
  }
  if (!convexClient) {
    convexClient = new ConvexHttpClient(url);
  }
  return convexClient;
}
