import { AUTH_RATE_LIMIT_BUCKET, CART_RATE_LIMIT_BUCKET, createAuthRateLimiter } from "./rate-limit-auth";
import { ApiError } from "../errors";
import { setRateLimiter, getRateLimiter, type RateLimiter } from "../rate-limit";

let authLimiterInstalled = false;

export function ensureAuthRateLimiter(): RateLimiter {
  if (!authLimiterInstalled) {
    setRateLimiter(createAuthRateLimiter());
    authLimiterInstalled = true;
  }
  return getRateLimiter();
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function enforceAuthRateLimit(request: Request, routeKey: string): Promise<void> {
  const limiter = ensureAuthRateLimiter();
  const decision = await limiter.check({
    bucket: AUTH_RATE_LIMIT_BUCKET,
    key: `${clientIp(request)}:${routeKey}`,
  });
  if (!decision.allowed) {
    throw new ApiError("RATE_LIMITED", "Too many authentication attempts", {
      status: 429,
    });
  }
}

export async function enforceCartRateLimit(request: Request, routeKey: string): Promise<void> {
  const limiter = ensureAuthRateLimiter();
  const decision = await limiter.check({
    bucket: CART_RATE_LIMIT_BUCKET,
    key: `${clientIp(request)}:${routeKey}`,
  });
  if (!decision.allowed) {
    throw new ApiError("RATE_LIMITED", "Too many cart requests", {
      status: 429,
    });
  }
}
