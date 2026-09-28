import { randomBytes } from "node:crypto";

/** Opaque session token — never log or return in API bodies. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export const CUSTOMER_SESSION_DAYS = 30;
export const STAFF_SESSION_HOURS = 12;

export function customerSessionExpiry(from = new Date()): Date {
  return new Date(from.getTime() + CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function staffSessionExpiry(from = new Date()): Date {
  return new Date(from.getTime() + STAFF_SESSION_HOURS * 60 * 60 * 1000);
}
