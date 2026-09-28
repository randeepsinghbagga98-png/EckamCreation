import {
  CustomerAuthService,
  StaffAuthService,
  getDefaultStaffSessionStore,
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
    staffAuth = new StaffAuthService(prisma, getDefaultStaffSessionStore());
  }
  return staffAuth;
}

/** Test hook */
export function resetAuthServices(): void {
  customerAuth = null;
  staffAuth = null;
}
