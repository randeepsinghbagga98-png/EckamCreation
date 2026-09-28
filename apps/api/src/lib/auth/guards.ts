import {
  AuthError,
  assertStaffPermission,
  type CustomerPrincipal,
  type PermissionCode,
  type StaffPrincipal,
} from "@eckamcreation/auth";
import { CUSTOMER_SESSION_COOKIE, STAFF_SESSION_COOKIE } from "./cookies";
import { getCustomerAuth, getStaffAuth } from "./services";
import { forbidden, unauthorized } from "../errors";

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function clientMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function resolveCustomer(request: Request): Promise<CustomerPrincipal | null> {
  const token = readCookie(request, CUSTOMER_SESSION_COOKIE);
  return getCustomerAuth().getSession(token);
}

export async function resolveStaff(request: Request): Promise<StaffPrincipal | null> {
  const token = readCookie(request, STAFF_SESSION_COOKIE);
  return getStaffAuth().getSession(token);
}

export async function requireAuthenticatedUser(request: Request): Promise<CustomerPrincipal> {
  const user = await resolveCustomer(request);
  if (!user) throw unauthorized("Authentication required");
  return user;
}

export async function requireStaff(request: Request): Promise<StaffPrincipal> {
  const staff = await resolveStaff(request);
  if (!staff) throw unauthorized("Staff authentication required");
  return staff;
}

export async function requirePermission(
  request: Request,
  permission: PermissionCode,
): Promise<StaffPrincipal> {
  const staff = await requireStaff(request);
  try {
    assertStaffPermission(staff, permission);
  } catch (error) {
    if (error instanceof AuthError && error.code === "FORBIDDEN") {
      throw forbidden("Insufficient permissions");
    }
    throw error;
  }
  return staff;
}

export function readCustomerSessionToken(request: Request): string | null {
  return readCookie(request, CUSTOMER_SESSION_COOKIE);
}

export function readStaffSessionToken(request: Request): string | null {
  return readCookie(request, STAFF_SESSION_COOKIE);
}
