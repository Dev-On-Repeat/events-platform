import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_COOKIE = 'events_admin';

export interface AdminSession {
  adminId: string;
  email: string;
  name: string;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET must be configured');
  }
  return secret;
}

export function createAdminToken(session: AdminSession): string {
  return jwt.sign(session, getAuthSecret(), { expiresIn: '8h' });
}

export function getAdminSession(request: NextRequest): AdminSession | null {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, getAuthSecret()) as AdminSession;
  } catch {
    return null;
  }
}

export function requireAdmin(request: NextRequest): AdminSession | NextResponse {
  const session = getAdminSession(request);
  return session ?? NextResponse.json({ error: 'Administrator access is required' }, { status: 401 });
}

export function isUnauthorized(result: AdminSession | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
