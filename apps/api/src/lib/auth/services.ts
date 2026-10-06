import {
  CustomerAuthService,
  StaffAuthService,
  PrismaStaffSessionStore,
} from "@eckamcreation/auth";
import { prisma } from "@eckamcreation/database";

let customerAuth: CustomerAuthService | null = null;
let staffAuth: StaffAuthService | null = null;

export function getCustomerAuth(): CustomerAuthService {
  if (!customerAuth) customerAuth = new CustomerAuthService(prisma);
  return customerAuth;
}

export function getStaffAuth(): StaffAuthService {
  if (!staffAuth) {
    // Durable DB-backed sessions so multi-instance production (e.g. Render) shares staff auth.
    staffAuth = new StaffAuthService(prisma, new PrismaStaffSessionStore(prisma));
  }
  return staffAuth;
}

/** Test hook */
export function resetAuthServices(): void {
  customerAuth = null;
  staffAuth = null;
}
