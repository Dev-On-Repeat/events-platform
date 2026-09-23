// Simple in-memory rate limiter (for development)
// In production, use Redis-based rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    
    return {
      success: true,
      remaining: limit - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Export specific rate limiters for different endpoints
export const rateLimiter = {
  // Registration: 5 requests per minute per IP
  registration: (identifier: string) => 
    rateLimit(identifier, 5, 60 * 1000),
  
  // Payment: 10 requests per minute per IP
  payment: (identifier: string) => 
    rateLimit(identifier, 10, 60 * 1000),
  
  // Webhook: 100 requests per minute (higher for payment gateway)
  webhook: (identifier: string) => 
    rateLimit(identifier, 100, 60 * 1000),
  
  // General API: 100 requests per minute per IP
  general: (identifier: string) => 
    rateLimit(identifier, 100, 60 * 1000),
  
  // Admin: 30 requests per minute per admin
  admin: (identifier: string) => 
    rateLimit(identifier, 30, 60 * 1000),
};
