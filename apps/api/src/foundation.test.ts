import { describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";

vi.mock("@eckamcreation/database", () => ({
  checkDatabaseHealth: vi.fn(async () => ({
    ready: true,
    schema: "phase-1" as const,
    latencyMs: 3,
  })),
  getCacheStatus: vi.fn(() => ({
    ready: false as const,
    reason: "redis-not-configured" as const,
  })),
}));

import { GET as getRoot } from "./app/route";
import { GET as getV1 } from "./app/v1/route";
import { GET as getHealth } from "./app/v1/health/route";
import { ApiError, fromZodError, toApiError, validationError } from "./lib/errors";
import { createRequestId, jsonError, jsonOk, respondApiError } from "./lib/http";
import { NoopRateLimiter, type RateLimiter } from "./lib/rate-limit";
import { checkDatabaseHealth } from "@eckamcreation/database";

describe("API HTTP helpers", () => {
  it("creates request ids and echoes valid incoming ids", () => {
    expect(createRequestId("req_abcdefghij")).toBe("req_abcdefghij");
    expect(createRequestId("bad id")).toMatch(/^req_/);
  });

  it("returns standardized success and error envelopes", async () => {
    const okRes = jsonOk({ hello: "world" }, { requestId: "req_oktest123456789012" });
    const okBody = await okRes.json();
    expect(okBody.ok).toBe(true);
    expect(okBody.data.hello).toBe("world");
    expect(okRes.headers.get("x-request-id")).toBe("req_oktest123456789012");

    const errRes = jsonError("NOT_FOUND", "missing", 404, undefined, "req_errtest123456789012");
    const errBody = await errRes.json();
    expect(errBody.ok).toBe(false);
    expect(errBody.error.code).toBe("NOT_FOUND");
    expect(errRes.status).toBe(404);
  });

  it("maps validation and unknown errors safely", async () => {
    expect(validationError("bad").code).toBe("VALIDATION_ERROR");
    const zodErr = fromZodError(
      new ZodError([{ code: "custom", message: "required", path: ["email"] }]),
    );
    expect(zodErr.details?.[0]?.path).toBe("email");

    const internal = toApiError(new Error("boom"));
    expect(internal.code).toBe("INTERNAL_ERROR");

    const prev = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");
    const res = respondApiError(new Error("secret stack"), "req_internal00000000001");
    const body = await res.json();
    vi.unstubAllEnvs();
    if (prev) vi.stubEnv("NODE_ENV", prev);
    expect(body.error.message).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toMatch(/stack/i);
  });

  it("provides a noop rate limiter abstraction", async () => {
    const limiter: RateLimiter = new NoopRateLimiter();
    const decision = await limiter.check({ key: "ip:1", bucket: "default" });
    expect(decision.allowed).toBe(true);
  });
});

describe("API foundation routes", () => {
  it("GET / returns foundation-ready status", async () => {
    const res = await getRoot(
      new Request("http://localhost:3002/", {
        headers: { "x-request-id": "req_roottest12345678901" },
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("foundation-ready");
    expect(body.meta.requestId).toBe("req_roottest12345678901");
  });

  it("GET /v1 returns phase-3.1 foundation marker", async () => {
    const res = await getV1(new Request("http://localhost:3002/v1"));
    const body = await res.json();
    expect(body.data.phase).toBe("phase-3.3-catalogue");
    expect(body.data.groups.find((g: { name: string }) => g.name === "health")?.handlers).toBe(
      "ready",
    );
    expect(body.data.groups.find((g: { name: string }) => g.name === "auth")?.handlers).toBe(
      "ready",
    );
    expect(body.data.groups.find((g: { name: string }) => g.name === "catalogue")?.handlers).toBe(
      "ready",
    );
  });

  it("GET /v1/health reports api and database components", async () => {
    vi.mocked(checkDatabaseHealth).mockResolvedValueOnce({
      ready: true,
      schema: "phase-1",
      latencyMs: 2,
    });

    const res = await getHealth(new Request("http://localhost:3002/v1/health"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe("ok");
    expect(body.data.api.status).toBe("up");
    expect(body.data.database.status).toBe("up");
    expect(body.data.database.schema).toBe("phase-1");
  });

  it("GET /v1/health returns degraded when database is down", async () => {
    vi.mocked(checkDatabaseHealth).mockResolvedValueOnce({
      ready: false,
      schema: "phase-1",
      latencyMs: 5,
      error: "unreachable",
    });

    const res = await getHealth(new Request("http://localhost:3002/v1/health"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.data.status).toBe("degraded");
    expect(body.data.database.status).toBe("down");
  });

  it("rejects invalid JSON shape via Zod helper", () => {
    const schema = z.object({ name: z.string() });
    const parsed = schema.safeParse({});
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const err = fromZodError(parsed.error);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe("VALIDATION_ERROR");
    }
  });
});
