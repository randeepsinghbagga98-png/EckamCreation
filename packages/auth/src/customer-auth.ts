import type { PrismaClient } from "@eckamcreation/database";
import { AuthError } from "./errors";
import type { EmailVerificationPort } from "./email-verification";
import { NoopEmailVerification } from "./email-verification";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, customerSessionExpiry } from "./session-token";
import type { CustomerPrincipal } from "./authorization";

export type CustomerAuthContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type CustomerSessionResult = {
  principal: CustomerPrincipal;
  sessionToken: string;
  expiresAt: Date;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly emailVerification: EmailVerificationPort = new NoopEmailVerification(),
  ) {}

  async register(
    input: { email: string; password: string; name?: string },
    _ctx: CustomerAuthContext = {},
  ): Promise<CustomerSessionResult> {
    const email = normalizeEmail(input.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      throw new AuthError("EMAIL_TAKEN", "An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            name: input.name ?? existing.name,
            deletedAt: null,
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            name: input.name,
            passwordHash,
            profile: { create: {} },
          },
        });

    if (existing) {
      await this.prisma.customerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    }

    await this.emailVerification.requestVerification({ userId: user.id, email });
    return this.createSession(user.id);
  }

  async login(
    input: { email: string; password: string },
    _ctx: CustomerAuthContext = {},
  ): Promise<CustomerSessionResult> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || !user.passwordHash) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    return this.createSession(user.id);
  }

  async getSession(sessionToken: string | null | undefined): Promise<CustomerPrincipal | null> {
    if (!sessionToken) return null;
    const session = await this.prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expires.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    if (session.user.deletedAt) return null;

    return {
      kind: "customer",
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  }

  async logout(sessionToken: string | null | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.prisma.session.deleteMany({ where: { sessionToken } });
  }

  private async createSession(userId: string): Promise<CustomerSessionResult> {
    const sessionToken = createSessionToken();
    const expiresAt = customerSessionExpiry();
    await this.prisma.session.create({
      data: { sessionToken, userId, expires: expiresAt },
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      sessionToken,
      expiresAt,
      principal: {
        kind: "customer",
        userId: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
