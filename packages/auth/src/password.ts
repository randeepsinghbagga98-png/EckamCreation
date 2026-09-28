import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { AuthError } from "./errors";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

/** Reasonable password policy for local/API auth (no provider email reset yet). */
export function validatePasswordStrength(password: string): void {
  if (password.length < 8 || password.length > 128) {
    throw new AuthError("WEAK_PASSWORD", "Password must be 8–128 characters");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new AuthError(
      "WEAK_PASSWORD",
      "Password must include at least one letter and one number",
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const parts = passwordHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[4];
  const hashB64 = parts[5];
  if (!saltB64 || !hashB64) return false;
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const derived = await scryptAsync(password, salt, expected.length, { N: n, r, p });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
