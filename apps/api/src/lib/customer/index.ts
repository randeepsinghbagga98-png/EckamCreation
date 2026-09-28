import { prisma } from "@eckamcreation/database";
import { CustomerService } from "./customer-service";

let service: CustomerService | null = null;

export function getCustomerService(): CustomerService {
  if (!service) service = new CustomerService(prisma);
  return service;
}

/** Test hook */
export function resetCustomerServices(): void {
  service = null;
}

export { CustomerService };
