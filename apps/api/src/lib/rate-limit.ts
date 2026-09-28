/**
 * Rate-limit abstraction for later Redis-backed enforcement.
 * Phase 3.1 ships a no-op allow-all implementation.
 */

export type RateLimitDecision = {
  allowed: boolean;
  remaining?: number;
  retryAfterSeconds?: number;
};

export type RateLimitKey = {
  /** Stable bucket key (e.g. IP, user id, route). */
  key: string;
  /** Logical limit name. */
  bucket: string;
};

export interface RateLimiter {
  check(input: RateLimitKey): Promise<RateLimitDecision>;
}

export class NoopRateLimiter implements RateLimiter {
  async check(): Promise<RateLimitDecision> {
    return { allowed: true };
  }
}

let limiter: RateLimiter = new NoopRateLimiter();

export function getRateLimiter(): RateLimiter {
  return limiter;
}

/** Test/seam hook for swapping implementations later. */
export function setRateLimiter(next: RateLimiter): void {
  limiter = next;
}
