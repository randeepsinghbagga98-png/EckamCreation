import type { ApiFailure, ApiSuccess } from "@eckamcreation/api-contracts";
import { ApiClientError, safeUserMessage } from "./errors";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  search?: Record<string, string | number | boolean | undefined>;
};

export type PaginationMeta = {
  nextCursor: string | null;
  hasMore: boolean;
};

export type AdminResult<T> = {
  data: T;
  pagination?: PaginationMeta;
};

function isApiFailure(value: unknown): value is ApiFailure {
  return Boolean(
    value &&
      typeof value === "object" &&
      "ok" in value &&
      (value as { ok?: unknown }).ok === false &&
      "error" in value,
  );
}

function isApiSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "ok" in value &&
      (value as { ok?: unknown }).ok === true &&
      "data" in value,
  );
}

function resolveRequestUrl(pathname: string, search: string): string {
  if (typeof window === "undefined") {
    const origin = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3002";
    return `${origin}${pathname}${search}`;
  }
  return `${pathname}${search}`;
}

export async function adminRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<AdminResult<T>> {
  const url = new URL(path, "http://localhost");
  if (options.search) {
    for (const [key, value] of Object.entries(options.search)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = new Headers({ accept: "application/json" });
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(resolveRequestUrl(url.pathname, url.search), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    cache: "no-store",
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiFailure(payload)) {
      throw new ApiClientError(
        response.status,
        payload.error.code,
        safeUserMessage(response.status, payload.error.code, payload.error.message),
        payload.error.details,
      );
    }
    throw new ApiClientError(response.status, "INTERNAL_ERROR", safeUserMessage(response.status));
  }

  if (isApiSuccess<T>(payload)) {
    return {
      data: payload.data,
      pagination: payload.meta?.pagination,
    };
  }

  throw new ApiClientError(
    response.status,
    "INTERNAL_ERROR",
    "The request returned an unexpected response.",
  );
}

export async function adminData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await adminRequest<T>(path, options);
  return result.data;
}
