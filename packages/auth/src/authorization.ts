import type { PrismaClient } from "@eckamcreation/database";
import type { PermissionCode } from "./permissions";
import { AuthError } from "./errors";

export type StaffPrincipal = {
  kind: "staff";
  staffUserId: string;
  email: string;
  name: string;
  roles: string[];
  permissions: PermissionCode[];
};

export type CustomerPrincipal = {
  kind: "customer";
  userId: string;
  email: string | null;
  name: string | null;
};

export type AuthPrincipal = CustomerPrincipal | StaffPrincipal;

export async function loadStaffPermissions(
  prisma: PrismaClient,
  staffUserId: string,
): Promise<{ roles: string[]; permissions: PermissionCode[] }> {
  const links = await prisma.staffUserRole.findMany({
    where: { staffUserId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const roles = links.map((l) => l.role.code);
  const permissionSet = new Set<PermissionCode>();
  for (const link of links) {
    for (const rp of link.role.permissions) {
      permissionSet.add(rp.permission.code as PermissionCode);
    }
  }
  return { roles, permissions: [...permissionSet] };
}

export function staffHasPermission(
  staff: StaffPrincipal,
  permission: PermissionCode,
): boolean {
  return staff.permissions.includes(permission);
}

export function assertStaffPermission(staff: StaffPrincipal, permission: PermissionCode): void {
  if (!staffHasPermission(staff, permission)) {
    throw new AuthError("FORBIDDEN", "Insufficient permissions");
  }
}
