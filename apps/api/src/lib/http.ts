import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  type ApiErrorCode,
  REQUEST_ID_HEADER,
  fail,
  httpStatusForErrorCode,
  ok,
  type paginationMetaSchema,
} from "@eckamcreation/api-contracts";
import type { z } from "zod";
import { ApiError, toApiError } from "./errors";
import { logger } from "./logger";

export function createRequestId(incoming?: string | null): string {
  const trimmed = incoming?.trim();
  if (trimmed && /^[A-Za-z0-9._-]{8,128}$/.test(trimmed)) {
    return trimmed;
  }
  return `req_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function requestIdFromHeaders(headers: Headers): string {
  return createRequestId(headers.get(REQUEST_ID_HEADER));
}

function withRequestIdHeader(response: NextResponse, id: string) {
  response.headers.set(REQUEST_ID_HEADER, id);
  return response;
}

export function jsonOk<T>(
  data: T,
  init?: {
    status?: number;
    requestId?: string;
    pagination?: z.infer<typeof paginationMetaSchema>;
    headers?: HeadersInit;
  },
) {
  const id = init?.requestId ?? createRequestId();
  const response = NextResponse.json(
    ok(data, { requestId: id, pagination: init?.pagination }),
    {
      status: init?.status ?? 200,
      headers: init?.headers,
    },
  );
  return withRequestIdHeader(response, id);
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status?: number,
  details?: Array<{ path?: string; message: string }>,
  id?: string,
) {
  const rid = id ?? createRequestId();
  const httpStatus = status ?? httpStatusForErrorCode(code);
  const response = NextResponse.json(fail(code, message, rid, details), {
    status: httpStatus,
  });
  return withRequestIdHeader(response, rid);
}

export function notImplemented(feature: string, id?: string) {
  return jsonError("NOT_IMPLEMENTED", `${feature} is not implemented yet`, 501, undefined, id);
}

export function respondApiError(error: unknown, requestId?: string) {
  const apiError = toApiError(error);
  const isProd = process.env.NODE_ENV === "production";
  const message =
    isProd && !apiError.expose ? "Internal server error" : apiError.message;

  if (apiError.code === "INTERNAL_ERROR") {
    logger.error("api.internal_error", {
      requestId,
      code: apiError.code,
      // Never include stack in the HTTP body; log only a short name.
      name: error instanceof Error ? error.name : "unknown",
    });
  }

  return jsonError(apiError.code, message, apiError.status, apiError.details, requestId);
}

/** Wrap a route handler with envelope error handling. */
export function withApiHandler<C = unknown>(
  handler: (request: Request, requestId: string, context: C) => Promise<Response> | Response,
) {
  return async (request: Request, context: C) => {
    const id = requestIdFromHeaders(request.headers);
    try {
      return await handler(request, id, context);
    } catch (error) {
      return respondApiError(error, id);
    }
  };
}

export { ApiError };
