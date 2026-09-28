import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  AuthError,
  PERMISSIONS,
  MemoryStaffSessionStore,
} from "./index";

describe("password security", () => {
  it("hashes and verifies passwords without exposing plaintext", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("Secret123");
    expect(await verifyPassword("Secret123", hash)).toBe(true);
    expect(await verifyPassword("Wrong1234", hash)).toBe(false);
  });

  it("rejects weak passwords", () => {
    expect(() => validatePasswordStrength("short1")).toThrow(AuthError);
    expect(() => validatePasswordStrength("12345678")).toThrow(AuthError);
    expect(() => validatePasswordStrength("NoDigitsHere")).toThrow(AuthError);
  });
});

describe("permission catalog", () => {
  it("exposes domain-oriented permission codes", () => {
    expect(PERMISSIONS.PRODUCTS_READ).toBe("products.read");
    expect(PERMISSIONS.ORDERS_UPDATE).toBe("orders.update");
  });
});

describe("staff session store", () => {
  it("creates, reads, and deletes sessions", async () => {
    const store = new MemoryStaffSessionStore();
    const token = "tok_test_abc";
    await store.create({
      token,
      staffUserId: "staff_1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const found = await store.get(token);
    expect(found?.staffUserId).toBe("staff_1");
    await store.delete(token);
    expect(await store.get(token)).toBeNull();
  });
});
