export { AuthError } from "./errors";
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "./password";
export {
  createSessionToken,
  customerSessionExpiry,
  staffSessionExpiry,
  CUSTOMER_SESSION_DAYS,
  STAFF_SESSION_HOURS,
} from "./session-token";
export {
  PERMISSIONS,
  ROLE_CODES,
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionCode,
  type RoleCode,
} from "./permissions";
export {
  type AuthPrincipal,
  type CustomerPrincipal,
  type StaffPrincipal,
  loadStaffPermissions,
  staffHasPermission,
  assertStaffPermission,
} from "./authorization";
export { writeAuditLog, type AuditWriteInput } from "./audit";
export {
  ensureRbacCatalog,
} from "./rbac-seed";
export {
  CustomerAuthService,
  type CustomerAuthContext,
  type CustomerSessionResult,
} from "./customer-auth";
export {
  StaffAuthService,
  type StaffAuthContext,
  type StaffSessionResult,
} from "./staff-auth";
export {
  type StaffSessionStore,
  type StaffSessionRecord,
  MemoryStaffSessionStore,
  getDefaultStaffSessionStore,
} from "./staff-session-store";
export {
  type EmailVerificationPort,
  NoopEmailVerification,
} from "./email-verification";

/** @deprecated Prefer CustomerAuthService / StaffAuthService. Kept for Phase 2 stub compatibility. */
export type AuthSession = {
  userId: string;
  email?: string | null;
  name?: string | null;
} | null;

/** @deprecated Prefer CustomerAuthService. */
export interface AuthService {
  getSession(): Promise<AuthSession>;
  register?(input: { email: string; password: string; name?: string }): Promise<AuthSession>;
  login?(input: { email: string; password: string }): Promise<AuthSession>;
  logout?(): Promise<void>;
}

export const AUTH_PROVIDER = "credentials+db-session" as const;

export class NotImplementedAuthError extends Error {
  readonly code = "NOT_IMPLEMENTED" as const;
  constructor(method: string) {
    super(`AuthService.${method} is not implemented yet`);
    this.name = "NotImplementedAuthError";
  }
}

/** @deprecated Use CustomerAuthService with Prisma. */
export function createAuthService(): AuthService {
  return {
    async getSession() {
      return null;
    },
    async register() {
      throw new NotImplementedAuthError("register");
    },
    async login() {
      throw new NotImplementedAuthError("login");
    },
    async logout() {
      throw new NotImplementedAuthError("logout");
    },
  };
}
