import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSION,
  fail,
  httpStatusForErrorCode,
  ok,
  REQUEST_ID_HEADER,
} from "@eckamcreation/api-contracts";
import {
  apiEnvSchema,
  envSchema,
  parseCorsOrigins,
  readAiProviderEnv,
  readPaymentProviderEnv,
  serverOnlyEnvKeys,
  publicEnvKeys,
  validateApiEnv,
} from "@eckamcreation/config";

describe("api contracts envelope", () => {
  it("builds success and error envelopes", () => {
    const success = ok({ ping: true }, { requestId: "req_test" });
    expect(success.ok).toBe(true);
    expect(success.meta.requestId).toBe("req_test");

    const error = fail("VALIDATION_ERROR", "bad", "req_test", [{ message: "x" }]);
    expect(error.ok).toBe(false);
    expect(error.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps error codes to HTTP statuses", () => {
    expect(httpStatusForErrorCode("VALIDATION_ERROR")).toBe(400);
    expect(httpStatusForErrorCode("UNAUTHORIZED")).toBe(401);
    expect(httpStatusForErrorCode("FORBIDDEN")).toBe(403);
    expect(httpStatusForErrorCode("NOT_FOUND")).toBe(404);
    expect(httpStatusForErrorCode("CONFLICT")).toBe(409);
    expect(httpStatusForErrorCode("RATE_LIMITED")).toBe(429);
    expect(httpStatusForErrorCode("PAYMENT_PROVIDER_NOT_CONFIGURED")).toBe(503);
    expect(httpStatusForErrorCode("AI_PROVIDER_NOT_CONFIGURED")).toBe(503);
    expect(httpStatusForErrorCode("AI_CONVERSATION_NOT_FOUND")).toBe(404);
    expect(httpStatusForErrorCode("AI_CONVERSATION_FORBIDDEN")).toBe(403);
    expect(httpStatusForErrorCode("AI_INVALID_MESSAGE")).toBe(400);
    expect(httpStatusForErrorCode("AI_PROVIDER_ERROR")).toBe(502);
    expect(httpStatusForErrorCode("AI_PROVIDER_AUTH_FAILED")).toBe(502);
    expect(httpStatusForErrorCode("AI_PROVIDER_RATE_LIMITED")).toBe(429);
    expect(httpStatusForErrorCode("AI_PROVIDER_TIMEOUT")).toBe(504);
    expect(httpStatusForErrorCode("AI_PROVIDER_UNAVAILABLE")).toBe(503);
    expect(httpStatusForErrorCode("AI_PROVIDER_INVALID_REQUEST")).toBe(400);
    expect(httpStatusForErrorCode("AI_TOOL_NOT_FOUND")).toBe(400);
    expect(httpStatusForErrorCode("AI_TOOL_INVALID_ARGUMENTS")).toBe(400);
    expect(httpStatusForErrorCode("AI_TOOL_EXECUTION_FAILED")).toBe(502);
    expect(httpStatusForErrorCode("AI_TOOL_LOOP_LIMIT")).toBe(400);
    expect(httpStatusForErrorCode("NOT_IMPLEMENTED")).toBe(501);
    expect(httpStatusForErrorCode("INTERNAL_ERROR")).toBe(500);
  });

  it("exports request id header constant", () => {
    expect(REQUEST_ID_HEADER).toBe("x-request-id");
    expect(CONTRACT_VERSION).toBeTruthy();
  });
});

describe("config env validation", () => {
  it("allows empty placeholders in base env schema", () => {
    const parsed = envSchema.safeParse({
      NODE_ENV: "development",
      DATABASE_URL: "",
      AI_PROVIDER: "",
      AI_API_KEY: "",
      AI_MODEL: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires DATABASE_URL for API env", () => {
    const missing = apiEnvSchema.safeParse({ NODE_ENV: "development", DATABASE_URL: "" });
    expect(missing.success).toBe(false);

    const okEnv = validateApiEnv({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://eckam:secret@localhost:5432/eckamcreation",
    });
    expect(okEnv.DATABASE_URL).toContain("eckamcreation");
  });

  it("boots with empty payment provider env", () => {
    const parsed = envSchema.safeParse({
      NODE_ENV: "development",
      PAYMENT_PROVIDER: "",
      PAYMENT_PROVIDER_KEY: "",
      PAYMENT_PROVIDER_SECRET: "",
      PAYMENT_WEBHOOK_SECRET: "",
      ALLOW_TEST_PAYMENT_PROVIDER: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.PAYMENT_PROVIDER).toBeUndefined();
      expect(parsed.data.PAYMENT_PROVIDER_KEY).toBeUndefined();
    }

    const snapshot = readPaymentProviderEnv({
      PAYMENT_PROVIDER: "",
      PAYMENT_PROVIDER_KEY: "",
      PAYMENT_PROVIDER_SECRET: "",
      PAYMENT_WEBHOOK_SECRET: "",
    });
    expect(snapshot.providerId).toBeNull();
    expect(snapshot.hasKey).toBe(false);
    expect(snapshot.hasSecret).toBe(false);
    expect(snapshot.hasWebhookSecret).toBe(false);
    expect(snapshot.allowTestProvider).toBe(false);

    const withSecrets = readPaymentProviderEnv({
      PAYMENT_PROVIDER: "reserved",
      PAYMENT_PROVIDER_KEY: "public-looking-key",
      PAYMENT_PROVIDER_SECRET: "super-secret",
      PAYMENT_WEBHOOK_SECRET: "webhook-secret",
    });
    expect(withSecrets.providerId).toBe("reserved");
    expect(withSecrets.hasKey).toBe(true);
    expect(withSecrets.hasSecret).toBe(true);
    expect(withSecrets.hasWebhookSecret).toBe(true);
    expect(JSON.stringify(withSecrets)).not.toMatch(/super-secret|webhook-secret|public-looking-key/);
  });

  it("keeps AI env server-only and never returns the API key", () => {
    expect(publicEnvKeys).not.toContain("AI_API_KEY");
    expect(publicEnvKeys).not.toContain("AI_PROVIDER");
    expect(publicEnvKeys).not.toContain("AI_MODEL");
    expect(serverOnlyEnvKeys).toEqual(expect.arrayContaining(["AI_PROVIDER", "AI_API_KEY", "AI_MODEL"]));

    const snapshot = readAiProviderEnv({
      AI_PROVIDER: "openai",
      AI_API_KEY: "sk-should-never-appear",
      AI_MODEL: "test-model",
    });
    expect(snapshot.providerId).toBe("openai");
    expect(snapshot.hasApiKey).toBe(true);
    expect(snapshot.model).toBe("test-model");
    expect(JSON.stringify(snapshot)).not.toContain("sk-should-never-appear");
  });

  it("parses CORS origins", () => {
    expect(parseCorsOrigins("http://localhost:3000, http://localhost:3001")).toEqual([
      "http://localhost:3000",
      "http://localhost:3001",
    ]);
    expect(parseCorsOrigins(undefined)).toEqual([]);
  });
});
