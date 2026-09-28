import type { PrismaClient, Prisma } from "@eckamcreation/database";

export type AuditWriteInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  staffUserId?: string | null;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Persist security-sensitive actions. Never include passwords/tokens/secrets in metadata. */
export async function writeAuditLog(prisma: PrismaClient, input: AuditWriteInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      staffUserId: input.staffUserId ?? undefined,
      actorUserId: input.actorUserId ?? undefined,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
}
