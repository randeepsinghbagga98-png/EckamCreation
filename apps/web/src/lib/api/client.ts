import {
  CART_TOKEN_HEADER,
  type ApiFailure,
  type ApiSuccess,
} from '@eckamcreation/api-contracts';
import { getGuestToken, rememberGuestToken } from '@/lib/cart/identity';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Array<{ path?: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ path?: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  cartToken?: string | null;
  idempotencyKey?: string;
  search?: Record<string, string | undefined>;
};

function isApiFailure(value: unknown): value is ApiFailure {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'ok' in value &&
      (value as { ok?: unknown }).ok === false &&
      'error' in value,
  );
}

function isApiSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'ok' in value &&
      (value as { ok?: unknown }).ok === true &&
      'data' in value,
  );
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(path, 'http://localhost');
  if (options.search) {
    for (const [key, value] of Object.entries(options.search)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers = new Headers({
    accept: 'application/json',
  });

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  const cartToken = options.cartToken ?? getGuestToken();
  if (cartToken) {
    headers.set(CART_TOKEN_HEADER, cartToken);
  }
  if (options.idempotencyKey) {
    headers.set('idempotency-key', options.idempotencyKey);
  }

  const response = await fetch(resolveRequestUrl(url.pathname, url.search), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
    cache: 'no-store',
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiFailure(payload)) {
      throw new ApiClientError(
        response.status,
        payload.error.code,
        payload.error.message,
        payload.error.details,
      );
    }

    throw new ApiClientError(
      response.status,
      'INTERNAL_ERROR',
      'The request could not be completed. Please try again.',
    );
  }

  if (isApiSuccess<T>(payload)) {
    rememberGuestFromPayload(payload.data);
    return payload.data;
  }

  throw new ApiClientError(
    response.status,
    'INTERNAL_ERROR',
    'The request returned an unexpected response.',
  );
}

function resolveRequestUrl(pathname: string, search: string): string {
  // Server: prefer private API_INTERNAL_URL, then public API origin.
  // Browser: use same-origin /v1 (Next rewrite) unless NEXT_PUBLIC_API_URL is set
  // for a dedicated API host (split Vercel deployment).
  if (typeof window === 'undefined') {
    const origin =
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://127.0.0.1:3002';
    return `${origin}${pathname}${search}`;
  }

  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi) {
    return `${publicApi.replace(/\/$/, '')}${pathname}${search}`;
  }

  return `${pathname}${search}`;
}

function rememberGuestFromPayload(data: unknown) {
  if (
    data &&
    typeof data === 'object' &&
    'guestToken' in data &&
    typeof (data as { guestToken?: unknown }).guestToken === 'string'
  ) {
    rememberGuestToken((data as { guestToken: string }).guestToken);
  }
}
