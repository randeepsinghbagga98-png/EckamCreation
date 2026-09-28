import { NextResponse, type NextRequest } from "next/server";
import { REQUEST_ID_HEADER } from "@eckamcreation/api-contracts";
import { parseCorsOrigins } from "@eckamcreation/config";
import { createRequestId } from "./lib/http";
import { loadRootEnvLocal } from "./lib/load-root-env";
import { logger } from "./lib/logger";

const DEFAULT_JSON_BODY_LIMIT = 1_048_576; // 1 MiB

function resolveCorsOrigin(request: NextRequest): string | null {
  loadRootEnvLocal();
  const allowed = parseCorsOrigins(process.env.CORS_ORIGINS);
  const origin = request.headers.get("origin");
  if (!origin) return null;

  // Dev defaults: allow local web (3000) and admin (3001) when CORS_ORIGINS unset.
  const defaults =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"];

  const list = allowed.length > 0 ? allowed : defaults;
  return list.includes(origin) ? origin : null;
}

function applyCors(response: NextResponse, request: NextRequest) {
  const allowedOrigin = resolveCorsOrigin(request);
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Request-Id, X-Cart-Token, Idempotency-Key, Cookie",
    );
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    response.headers.set("Access-Control-Expose-Headers", REQUEST_ID_HEADER);
  }
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  return response;
}

export function proxy(request: NextRequest) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const started = Date.now();

  // Reject oversized JSON bodies early (Content-Length based).
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") && request.method !== "GET" && request.method !== "HEAD") {
    loadRootEnvLocal();
    const limit = Number(process.env.API_JSON_BODY_LIMIT_BYTES ?? DEFAULT_JSON_BODY_LIMIT);
    const lengthHeader = request.headers.get("content-length");
    if (lengthHeader) {
      const length = Number(lengthHeader);
      if (Number.isFinite(length) && length > limit) {
        const body = {
          ok: false as const,
          error: {
            code: "VALIDATION_ERROR" as const,
            message: "Request body too large",
            requestId,
          },
        };
        const tooLarge = NextResponse.json(body, { status: 413 });
        tooLarge.headers.set(REQUEST_ID_HEADER, requestId);
        applySecurityHeaders(tooLarge);
        applyCors(tooLarge, request);
        return tooLarge;
      }
    }
  }

  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set(REQUEST_ID_HEADER, requestId);
    applySecurityHeaders(preflight);
    applyCors(preflight, request);
    return preflight;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  applySecurityHeaders(response);
  applyCors(response, request);

  logger.info("api.request", {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    durationMsHint: Date.now() - started,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
