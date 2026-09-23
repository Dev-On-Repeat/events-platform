import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // Admin routes are now protected by server-side AUTH_SECRET in actions
  // No authentication middleware needed for development
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
