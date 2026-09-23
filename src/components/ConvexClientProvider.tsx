"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = useMemo(() => {
    let url = process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210";
    if (url.includes("mock-demo") || url.includes("mock-convex")) {
      url = "http://127.0.0.1:3210";
    }
    return url;
  }, []);

  const convex = useMemo(() => {
    try {
      return new ConvexReactClient(convexUrl);
    } catch {
      return new ConvexReactClient("http://127.0.0.1:3210");
    }
  }, [convexUrl]);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
