import { ApiClientError } from '@/lib/api/client';

const UNSAFE_MESSAGE = /prisma|sql|jwt|token|cookie|stack|database|scrypt|passwordhash|secret|internal/i;

export const AUTH_RETRY_MESSAGE = 'Something went wrong. Please try again.';
export const AUTH_REQUIRED_MESSAGE = 'Please sign in to continue.';
export const INVALID_CREDENTIALS_MESSAGE = 'The email or password is incorrect.';
export const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists.';
export const FORBIDDEN_MESSAGE = 'You are not authorized to do that.';
export const VALIDATION_MESSAGE = 'Please check the details and try again.';

export type AuthErrorContext = 'login' | 'signup' | 'generic';

export function isSafeClientMessage(message: string): boolean {
  return Boolean(message.trim()) && !UNSAFE_MESSAGE.test(message);
}

export function firstFieldError(
  details?: Array<{ path?: string; message: string }>,
): string | undefined {
  const match = details?.find((detail) => isSafeClientMessage(detail.message));
  return match?.message;
}

export function messageForAuthError(
  error: unknown,
  context: AuthErrorContext = 'generic',
): string {
  if (!(error instanceof ApiClientError)) {
    return AUTH_RETRY_MESSAGE;
  }

  if (error.status === 401) {
    return context === 'login' ? INVALID_CREDENTIALS_MESSAGE : AUTH_REQUIRED_MESSAGE;
  }

  if (error.status === 403) {
    return FORBIDDEN_MESSAGE;
  }

  if (error.status === 409) {
    return context === 'signup' ? EMAIL_TAKEN_MESSAGE : 'This request conflicts with existing data.';
  }

  if (error.status === 400 || error.status === 422) {
    return firstFieldError(error.details) ?? VALIDATION_MESSAGE;
  }

  if (error.status >= 500) {
    return AUTH_RETRY_MESSAGE;
  }

  return isSafeClientMessage(error.message) ? error.message : AUTH_RETRY_MESSAGE;
}

export function fieldErrorsFromApi(
  error: unknown,
): Record<string, string> {
  if (!(error instanceof ApiClientError) || !error.details) {
    return {};
  }

  const next: Record<string, string> = {};
  for (const detail of error.details) {
    if (!detail.path || !isSafeClientMessage(detail.message)) {
      continue;
    }
    next[detail.path] = detail.message;
  }
  return next;
}
