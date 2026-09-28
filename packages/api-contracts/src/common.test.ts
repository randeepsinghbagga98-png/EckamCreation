import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSION,
  fail,
  httpStatusForErrorCode,
  ok,
  REQUEST_ID_HEADER,
} from "@eckamcreation/api-contracts";
import { apiEnvSchema, envSchema, parseCorsOrigins, validateApiEnv } from "@eckamcreation/config";

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
      AI_API_KEY: "",
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

  it("parses CORS origins", () => {
    expect(parseCorsOrigins("http://localhost:3000, http://localhost:3001")).toEqual([
      "http://localhost:3000",
      "http://localhost:3001",
    ]);
    expect(parseCorsOrigins(undefined)).toEqual([]);
  });
});
