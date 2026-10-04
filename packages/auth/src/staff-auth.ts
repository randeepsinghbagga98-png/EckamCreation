import type { PrismaClient } from "@eckamcreation/database";
import { AuthError } from "./errors";
import { writeAuditLog } from "./audit";
import { loadStaffPermissions, type StaffPrincipal } from "./authorization";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, staffSessionExpiry } from "./session-token";
import {
  getDefaultStaffSessionStore,
  type StaffSessionStore,
} from "./staff-session-store";
import type { RoleCode } from "./permissions";
import { ensureRbacCatalog } from "./rbac-seed";

export type StaffAuthContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type StaffSessionResult = {
  principal: StaffPrincipal;
  sessionToken: string;
  expiresAt: Date;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessions: StaffSessionStore = getDefaultStaffSessionStore(),
  ) {}

  /**
   * Creates the first ACTIVE staff admin from ADMIN_EMAIL / ADMIN_PASSWORD
   * when no active staff users exist. Never overwrites existing staff.
   */
  async ensureBootstrapAdmin(): Promise<void> {
    const emailRaw = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!emailRaw || !password) return;
    if (password.length < 8 || password.length > 128) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return;

    const activeCount = await this.prisma.staffUser.count({ where: { status: "ACTIVE" } });
    if (activeCount > 0) return;

    const email = normalizeEmail(emailRaw);
    const clash = await this.prisma.staffUser.findUnique({ where: { email } });
    if (clash) return;

    try {
      const staff = await this.createStaffUser({
        email,
        name: "Administrator",
        password,
        roleCodes: ["admin"],
        status: "ACTIVE",
      });
      await writeAuditLog(this.prisma, {
        action: "staff.bootstrap",
        entityType: "StaffUser",
        entityId: staff.id,
        staffUserId: staff.id,
        metadata: { email },
      });
    } catch {
      // Concurrent bootstrap or unique-email race — login continues normally.
    }
  }

  /** Invite-only bootstrap helper for tests/ops — not a public API. */
  async createStaffUser(input: {
    email: string;
    name: string;
    password: string;
    roleCodes?: RoleCode[];
    status?: "ACTIVE" | "INVITED" | "DISABLED";
  }) {
    await ensureRbacCatalog(this.prisma);
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);
    const staff = await this.prisma.staffUser.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        status: input.status ?? "ACTIVE",
      },
    });

    const roles = input.roleCodes ?? ["admin"];
    for (const code of roles) {
      const role = await this.prisma.role.findUniqueOrThrow({ where: { code } });
      await this.prisma.staffUserRole.create({
        data: { staffUserId: staff.id, roleId: role.id },
      });
    }
    return staff;
  }

  async login(
    input: { email: string; password: string },
    ctx: StaffAuthContext = {},
  ): Promise<StaffSessionResult> {
    const email = normalizeEmail(input.email);
    const staff = await this.prisma.staffUser.findUnique({ where: { email } });

    if (!staff || !staff.passwordHash || staff.status !== "ACTIVE") {
      await writeAuditLog(this.prisma, {
        action: "staff.login_failed",
        entityType: "StaffUser",
        entityId: staff?.id,
        metadata: { reason: "invalid_or_inactive" },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    const ok = await verifyPassword(input.password, staff.passwordHash);
    if (!ok) {
      await writeAuditLog(this.prisma, {
        action: "staff.login_failed",
        entityType: "StaffUser",
        entityId: staff.id,
        staffUserId: staff.id,
        metadata: { reason: "bad_password" },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    const { roles, permissions } = await loadStaffPermissions(this.prisma, staff.id);
    const sessionToken = createSessionToken();
    const expiresAt = staffSessionExpiry();
    await this.sessions.create({ token: sessionToken, staffUserId: staff.id, expiresAt });

    await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    });

    await writeAuditLog(this.prisma, {
      action: "staff.login",
      entityType: "StaffUser",
      entityId: staff.id,
      staffUserId: staff.id,
      metadata: { roles },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      sessionToken,
      expiresAt,
      principal: {
        kind: "staff",
        staffUserId: staff.id,
        email: staff.email,
        name: staff.name,
        roles,
        permissions,
      },
    };
  }

  async getSession(sessionToken: string | null | undefined): Promise<StaffPrincipal | null> {
    if (!sessionToken) return null;
    const record = await this.sessions.get(sessionToken);
    if (!record) return null;

    const staff = await this.prisma.staffUser.findUnique({ where: { id: record.staffUserId } });
    if (!staff || staff.status !== "ACTIVE") {
      await this.sessions.delete(sessionToken);
      return null;
    }

    const { roles, permissions } = await loadStaffPermissions(this.prisma, staff.id);
    return {
      kind: "staff",
      staffUserId: staff.id,
      email: staff.email,
      name: staff.name,
      roles,
      permissions,
    };
  }

  async logout(
    sessionToken: string | null | undefined,
    ctx: StaffAuthContext = {},
  ): Promise<void> {
    if (!sessionToken) return;
    const record = await this.sessions.get(sessionToken);
    await this.sessions.delete(sessionToken);
    if (record) {
      await writeAuditLog(this.prisma, {
        action: "staff.logout",
        entityType: "StaffUser",
        entityId: record.staffUserId,
        staffUserId: record.staffUserId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }
  }
}
