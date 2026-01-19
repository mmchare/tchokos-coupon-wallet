// Simple in-memory rate limiter for edge functions
// Uses a sliding window algorithm

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store (note: resets on function cold start, which is acceptable for basic protection)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;       // Milliseconds until reset
}

export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  // Clean up old entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(config.windowMs);
  }
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now - entry.windowStart >= config.windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }
  
  // Within existing window
  const remaining = config.maxRequests - entry.count - 1;
  const resetIn = config.windowMs - (now - entry.windowStart);
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: Math.max(0, remaining),
    resetIn
  };
}

function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart >= windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}

// Helper to get client identifier from request
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from common headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip');
  
  // Priority: Cloudflare > X-Real-IP > X-Forwarded-For > fallback
  const ip = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : 'unknown');
  
  return ip;
}

// Create rate limit response
export function rateLimitResponse(resetIn: number, corsHeaders: Record<string, string>): Response {
  const retryAfter = Math.ceil(resetIn / 1000);
  return new Response(
    JSON.stringify({ 
      error: 'Trop de requêtes. Veuillez réessayer plus tard.',
      retry_after_seconds: retryAfter
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': retryAfter.toString()
      } 
    }
  );
}

// Pre-configured rate limits for different use cases
export const RATE_LIMITS = {
  // Order creation: 10 requests per minute per user
  ORDER_CREATE: { windowMs: 60000, maxRequests: 10 },
  
  // AI Search: 30 requests per minute per IP  
  AI_SEARCH: { windowMs: 60000, maxRequests: 30 },
  
  // AI Recommendations: 20 requests per minute per user
  AI_RECOMMENDATIONS: { windowMs: 60000, maxRequests: 20 },
  
  // AI Similar Products: 30 requests per minute per IP
  AI_SIMILAR: { windowMs: 60000, maxRequests: 30 },
  
  // OTP Send: 5 requests per 5 minutes per phone (anti-spam)
  OTP_SEND: { windowMs: 300000, maxRequests: 5 },
  
  // Payment initiation: 5 requests per minute per user
  PAYMENT: { windowMs: 60000, maxRequests: 5 },
  
  // Magic import: 10 requests per minute per IP
  MAGIC_IMPORT: { windowMs: 60000, maxRequests: 10 }
} as const;
