import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_APP_NAME: z.preprocess(emptyToUndefined, z.string().optional()),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  AUTH_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  AUTH_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  AI_PROVIDER: z.preprocess(emptyToUndefined, z.string().min(1).max(64).optional()),
  AI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  AI_MODEL: z.preprocess(emptyToUndefined, z.string().min(1).max(128).optional()),
  AI_API_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  EMAIL_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().optional()),
  WHATSAPP_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  WHATSAPP_PHONE_NUMBER_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  /**
   * Reserved provider id for a future client-selected adapter.
   * Empty means no live provider. Does not register or activate an adapter.
   */
  PAYMENT_PROVIDER: z.preprocess(emptyToUndefined, z.string().min(1).max(64).optional()),
  PAYMENT_PROVIDER_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYMENT_PROVIDER_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYMENT_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  /** Set to "1" only in non-production to register TestPaymentAdapter. */
  ALLOW_TEST_PAYMENT_PROVIDER: z.preprocess(emptyToUndefined, z.string().optional()),
  STORAGE_ENDPOINT: z.preprocess(emptyToUndefined, z.string().optional()),
  STORAGE_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STORAGE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STORAGE_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  STORAGE_REGION: z.preprocess(emptyToUndefined, z.string().optional()),
  /** Comma-separated browser origins allowed for CORS (web/admin). Empty = reflect none until configured. */
  CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
  API_INTERNAL_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  /** Max JSON body size in bytes for API writes (enforced in proxy via Content-Length). */
  API_JSON_BODY_LIMIT_BYTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

/** API process requires a real DATABASE_URL. Provider keys stay optional. */
export const apiEnvSchema = envSchema.extend({
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().min(1, "DATABASE_URL is required for the API"),
  ),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return apiEnvSchema.parse(source);
}

export const publicEnvKeys = ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_NAME"] as const;

export const serverOnlyEnvKeys = [
  "DATABASE_URL",
  "REDIS_URL",
  "AUTH_SECRET",
  "AI_PROVIDER",
  "AI_API_KEY",
  "AI_MODEL",
  "AI_API_BASE_URL",
  "EMAIL_API_KEY",
  "EMAIL_FROM",
  "WHATSAPP_API_KEY",
  "WHATSAPP_PHONE_NUMBER_ID",
  "PAYMENT_PROVIDER",
  "PAYMENT_PROVIDER_KEY",
  "PAYMENT_PROVIDER_SECRET",
  "PAYMENT_WEBHOOK_SECRET",
  "ALLOW_TEST_PAYMENT_PROVIDER",
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
  "STORAGE_BUCKET",
  "STORAGE_REGION",
  "CORS_ORIGINS",
  "API_INTERNAL_URL",
  "API_JSON_BODY_LIMIT_BYTES",
] as const;

/**
 * Presence-only payment env snapshot. Never returns secret values.
 * Setting these variables does not register or activate a provider.
 */
/**
 * Presence-only AI env snapshot. Never returns secret values.
 * Setting these variables does not invent a model or activate a fallback provider.
 */
export function readAiProviderEnv(source: NodeJS.ProcessEnv = process.env) {
  return {
    providerId: source.AI_PROVIDER?.trim() || null,
    hasApiKey: Boolean(source.AI_API_KEY?.trim()),
    model: source.AI_MODEL?.trim() || null,
    hasBaseUrl: Boolean(source.AI_API_BASE_URL?.trim()),
  };
}

export function readPaymentProviderEnv(source: NodeJS.ProcessEnv = process.env) {
  return {
    providerId: source.PAYMENT_PROVIDER?.trim() || null,
    hasKey: Boolean(source.PAYMENT_PROVIDER_KEY?.trim()),
    hasSecret: Boolean(source.PAYMENT_PROVIDER_SECRET?.trim()),
    hasWebhookSecret: Boolean(source.PAYMENT_WEBHOOK_SECRET?.trim()),
    allowTestProvider: source.ALLOW_TEST_PAYMENT_PROVIDER === "1",
  };
}

export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
