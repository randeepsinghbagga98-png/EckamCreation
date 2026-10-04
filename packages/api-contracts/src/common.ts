import { z } from "zod";

export const CONTRACT_VERSION = "2026.09.18-phase2" as const;

export const REQUEST_ID_HEADER = "x-request-id" as const;

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_REPLAY",
  "RATE_LIMITED",
  "PAYMENT_PROVIDER_NOT_CONFIGURED",
  "AI_PROVIDER_NOT_CONFIGURED",
  "AI_CONVERSATION_NOT_FOUND",
  "AI_CONVERSATION_FORBIDDEN",
  "AI_INVALID_MESSAGE",
  "AI_PROVIDER_ERROR",
  "AI_PROVIDER_AUTH_FAILED",
  "AI_PROVIDER_RATE_LIMITED",
  "AI_PROVIDER_TIMEOUT",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_PROVIDER_INVALID_REQUEST",
  "AI_TOOL_NOT_FOUND",
  "AI_TOOL_INVALID_ARGUMENTS",
  "AI_TOOL_EXECUTION_FAILED",
  "AI_TOOL_LOOP_LIMIT",
  "NOT_IMPLEMENTED",
  "INTERNAL_ERROR",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** Canonical HTTP status for envelope error codes. */
export function httpStatusForErrorCode(code: ApiErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "IDEMPOTENCY_REPLAY":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "PAYMENT_PROVIDER_NOT_CONFIGURED":
    case "AI_PROVIDER_NOT_CONFIGURED":
    case "AI_PROVIDER_UNAVAILABLE":
      return 503;
    case "AI_CONVERSATION_NOT_FOUND":
      return 404;
    case "AI_CONVERSATION_FORBIDDEN":
      return 403;
    case "AI_INVALID_MESSAGE":
    case "AI_TOOL_NOT_FOUND":
    case "AI_TOOL_INVALID_ARGUMENTS":
    case "AI_TOOL_LOOP_LIMIT":
    case "AI_PROVIDER_INVALID_REQUEST":
      return 400;
    case "AI_PROVIDER_AUTH_FAILED":
      return 502;
    case "AI_PROVIDER_RATE_LIMITED":
      return 429;
    case "AI_PROVIDER_TIMEOUT":
      return 504;
    case "AI_PROVIDER_ERROR":
    case "AI_TOOL_EXECUTION_FAILED":
      return 502;
    case "NOT_IMPLEMENTED":
      return 501;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

export const healthComponentSchema = z.object({
  status: z.enum(["up", "down"]),
  latencyMs: z.number().int().nonnegative().optional(),
});

export const healthDataSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  contractVersion: z.string(),
  api: healthComponentSchema,
  database: healthComponentSchema.extend({
    schema: z.literal("phase-1").optional(),
  }),
  timestamp: z.string(),
});

export type HealthData = z.infer<typeof healthDataSchema>;

export const moneySchema = z.object({
  amountMinor: z.string().regex(/^-?\d+$/),
  currencyCode: z.string().min(3).max(3),
});

export type MoneyDto = z.infer<typeof moneySchema>;

export const paginationMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const successMetaSchema = z.object({
  requestId: z.string(),
  pagination: paginationMetaSchema.optional(),
});

export function ok<T>(data: T, meta: { requestId: string; pagination?: z.infer<typeof paginationMetaSchema> }) {
  return { ok: true as const, data, meta };
}

export function fail(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: Array<{ path?: string; message: string }>,
) {
  return {
    ok: false as const,
    error: { code, message, details, requestId },
  };
}

export type ApiSuccess<T> = ReturnType<typeof ok<T>>;
export type ApiFailure = ReturnType<typeof fail>;
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export function moneyFromBigInt(amountMinor: bigint, currencyCode: string): MoneyDto {
  return { amountMinor: amountMinor.toString(), currencyCode };
}
