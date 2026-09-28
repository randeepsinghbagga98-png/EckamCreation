import { AuthError } from "@eckamcreation/auth";
import { PaymentError } from "@eckamcreation/payments";
import {
  type ApiErrorCode,
  httpStatusForErrorCode,
} from "@eckamcreation/api-contracts";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Array<{ path?: string; message: string }>;
  readonly expose: boolean;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: {
      status?: number;
      details?: Array<{ path?: string; message: string }>;
      cause?: unknown;
      /** When false, clients get a generic message in production. */
      expose?: boolean;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "ApiError";
    this.code = code;
    this.status = options?.status ?? httpStatusForErrorCode(code);
    this.details = options?.details;
    this.expose = options?.expose ?? code !== "INTERNAL_ERROR";
  }
}

export function validationError(
  message: string,
  details?: Array<{ path?: string; message: string }>,
) {
  return new ApiError("VALIDATION_ERROR", message, { details });
}

export function unauthorized(message = "Authentication required") {
  return new ApiError("UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return new ApiError("FORBIDDEN", message);
}

export function notFound(message = "Resource not found") {
  return new ApiError("NOT_FOUND", message);
}

export function conflict(message: string) {
  return new ApiError("CONFLICT", message);
}

export function internalError(message = "Internal server error", cause?: unknown) {
  return new ApiError("INTERNAL_ERROR", message, { cause, expose: false });
}

export function fromZodError(error: ZodError) {
  return validationError("Request validation failed", zodDetails(error));
}

export function zodDetails(error: ZodError): Array<{ path?: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : undefined,
    message: issue.message,
  }));
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) return fromZodError(error);
  if (error instanceof PaymentError) {
    return new ApiError(error.code as ApiErrorCode, error.message);
  }
  if (error instanceof AuthError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
      case "UNAUTHORIZED":
        return unauthorized(error.message);
      case "EMAIL_TAKEN":
        return conflict(error.message);
      case "WEAK_PASSWORD":
        return validationError(error.message);
      case "FORBIDDEN":
      case "ACCOUNT_DISABLED":
        return forbidden(error.message);
      case "NOT_FOUND":
        return notFound(error.message);
      default:
        return internalError("Authentication error", error);
    }
  }
  return internalError("Internal server error", error);
}
