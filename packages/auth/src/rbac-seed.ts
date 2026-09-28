import type { PrismaClient } from "@eckamcreation/database";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  ROLE_CODES,
  type PermissionCode,
  type RoleCode,
} from "./permissions";

function splitCode(code: PermissionCode): { resource: string; action: string } {
  const [resource, action] = code.split(".");
  return { resource: resource!, action: action! };
}

/** Idempotent seed of default roles + permissions from the centralized catalog. */
export async function ensureRbacCatalog(prisma: PrismaClient): Promise<void> {
  const permissionCodes = Object.values(PERMISSIONS);
  for (const code of permissionCodes) {
    const { resource, action } = splitCode(code);
    await prisma.permission.upsert({
      where: { code },
      create: { code, resource, action },
      update: { resource, action },
    });
  }

  const roleMeta: Record<RoleCode, { name: string; description: string }> = {
    admin: { name: "Administrator", description: "Full staff access" },
    ops: { name: "Operations", description: "Catalogue, inventory, and order ops" },
    support: { name: "Support", description: "Customer and order support" },
    analyst: { name: "Analyst", description: "Read-only analytics access" },
  };

  for (const roleCode of Object.values(ROLE_CODES)) {
    const meta = roleMeta[roleCode];
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      create: { code: roleCode, name: meta.name, description: meta.description },
      update: { name: meta.name, description: meta.description },
    });

    const desired = DEFAULT_ROLE_PERMISSIONS[roleCode];
    for (const permCode of desired) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permCode } });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }
}
