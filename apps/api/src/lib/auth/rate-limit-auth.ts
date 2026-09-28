import type { RateLimitDecision, RateLimitKey, RateLimiter } from "../rate-limit";

type BucketState = {
  timestamps: number[];
};

/**
 * Single-process in-memory rate limiter.
 * Production multi-instance deployments need Redis (or similar) shared storage.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, BucketState>();

  constructor(
    private readonly limits: Record<string, { max: number; windowMs: number }>,
  ) {}

  async check(input: RateLimitKey): Promise<RateLimitDecision> {
    const rule = this.limits[input.bucket];
    if (!rule) return { allowed: true };

    const key = `${input.bucket}:${input.key}`;
    const now = Date.now();
    const state = this.buckets.get(key) ?? { timestamps: [] };
    state.timestamps = state.timestamps.filter((t) => now - t < rule.windowMs);

    if (state.timestamps.length >= rule.max) {
      const oldest = state.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000));
      this.buckets.set(key, state);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    state.timestamps.push(now);
    this.buckets.set(key, state);
    return {
      allowed: true,
      remaining: Math.max(0, rule.max - state.timestamps.length),
    };
  }

  clear(): void {
    this.buckets.clear();
  }
}

export const AUTH_RATE_LIMIT_BUCKET = "auth";
export const CART_RATE_LIMIT_BUCKET = "cart";

/** Stricter than general API traffic: 20 attempts / 15 minutes per IP+route. */
export function createAuthRateLimiter() {
  return new MemoryRateLimiter({
    [AUTH_RATE_LIMIT_BUCKET]: { max: 20, windowMs: 15 * 60 * 1000 },
    /** Public cart mutations: 120 / 15 minutes per IP+route. */
    [CART_RATE_LIMIT_BUCKET]: { max: 120, windowMs: 15 * 60 * 1000 },
  });
}
