import { prisma } from "@eckamcreation/database";
import { AdminCustomerService, AuditLogService } from "./customer-service";
import { DashboardService } from "./dashboard-service";
import { InventoryService } from "./inventory-service";
import { AdminPaymentService } from "./payment-service";

let dashboard: DashboardService | null = null;
let inventory: InventoryService | null = null;
let customers: AdminCustomerService | null = null;
let auditLogs: AuditLogService | null = null;
let payments: AdminPaymentService | null = null;

export function getDashboardService() {
  if (!dashboard) dashboard = new DashboardService(prisma);
  return dashboard;
}

export function getInventoryService() {
  if (!inventory) inventory = new InventoryService(prisma);
  return inventory;
}

export function getAdminCustomerService() {
  if (!customers) customers = new AdminCustomerService(prisma);
  return customers;
}

export function getAuditLogService() {
  if (!auditLogs) auditLogs = new AuditLogService(prisma);
  return auditLogs;
}

export function getAdminPaymentService() {
  if (!payments) payments = new AdminPaymentService(prisma);
  return payments;
}

export function resetAdminServices() {
  dashboard = null;
  inventory = null;
  customers = null;
  auditLogs = null;
  payments = null;
}

export {
  DashboardService,
  InventoryService,
  AdminCustomerService,
  AuditLogService,
  AdminPaymentService,
};
