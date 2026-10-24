import { NextResponse } from 'next/server';

// Simple in-memory rate limiting
// Note: In a serverless environment like Vercel, this map will be reset frequently
// For robust production rate limiting, use Redis (e.g., Upstash)

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const rateLimit = new Map<string, RateLimitRecord>();

/**
 * Check if the request exceeds the rate limit
 * @param ip IP address
 * @param maxRequests Maximum allowed requests allowed within the window
 * @param windowMs Time window in milliseconds
 * @returns true if request is allowed, false if blocked
 */
export function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  // Clean up old entries periodically to prevent memory leaks (probabilistic)
  if (Math.random() < 0.01) {
    const now = Date.now();
    for (const [key, record] of rateLimit.entries()) {
      if (now > record.resetTime) {
        rateLimit.delete(key);
      }
    }
  }

  const now = Date.now();
  const record = rateLimit.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Helper to get rate limit response
 */
export function getRateLimitResponse() {
  return NextResponse.json(
    { error: 'Too many requests, please try again later.' },
    { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    }
  );
}
