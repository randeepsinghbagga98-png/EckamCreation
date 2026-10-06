import { NextResponse } from "next/server";

/** Runtime API origin for server-side admin → API proxying. */
export function apiOrigin(): string {
  return process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3002";
}

function forwardSetCookies(from: Response, to: NextResponse) {
  const cookies = from.headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    for (const cookie of cookies) {
      to.headers.append("set-cookie", cookie);
    }
    return;
  }
  const single = from.headers.get("set-cookie");
  if (single) {
    to.headers.append("set-cookie", single);
  }
}

/**
 * Proxy a browser request to the API and preserve Set-Cookie on the admin origin.
 * Used for staff auth so session cookies are bound to the admin host, not lost
 * across external rewrites / multi-instance API memory stores.
 */
export async function proxyToApi(request: Request, apiPath: string): Promise<NextResponse> {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  const cookie = request.headers.get("cookie");
  const requestId = request.headers.get("x-request-id");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  else headers.set("accept", "application/json");
  if (cookie) headers.set("cookie", cookie);
  if (requestId) headers.set("x-request-id", requestId);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;
  const search = new URL(request.url).search;
  const upstreamUrl = `${apiOrigin()}${apiPath}${search}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to reach the API service",
          requestId: "proxy_upstream_unreachable",
        },
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  const response = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
  const upstreamRequestId = upstream.headers.get("x-request-id");
  if (upstreamRequestId) {
    response.headers.set("x-request-id", upstreamRequestId);
  }
  forwardSetCookies(upstream, response);
  return response;
}
