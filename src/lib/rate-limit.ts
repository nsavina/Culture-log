/**
 * In-memory sliding-window rate limiter.
 *
 * Best-effort protection for AI endpoints: on serverless (Vercel) the counter
 * lives per instance, which is sufficient to protect the LLM budget of a
 * small app. Swap for a shared store (Upstash/Redis) if strict global limits
 * are ever needed.
 */

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (0 when allowed) */
  retryAfterSeconds: number;
}

const buckets = new Map<string, number[]>();

/** Prevent unbounded growth if many distinct keys accumulate */
const MAX_KEYS = 10_000;

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now()
): RateLimitResult {
  if (buckets.size > MAX_KEYS) {
    buckets.clear();
  }

  const cutoff = now - windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    const retryAfterMs = timestamps[0] + windowMs - now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test helper — reset all counters */
export function resetRateLimits() {
  buckets.clear();
}
