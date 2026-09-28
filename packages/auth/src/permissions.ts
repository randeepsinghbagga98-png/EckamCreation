/**
 * Domain-oriented permission codes (Permission.code / resource.action).
 * Keep this list focused — expand only when a real handler needs it.
 */
export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  PRODUCTS_READ: "products.read",
  PRODUCTS_WRITE: "products.write",
  ORDERS_READ: "orders.read",
  ORDERS_UPDATE: "orders.update",
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_UPDATE: "customers.update",
  INVENTORY_READ: "inventory.read",
  INVENTORY_ADJUST: "inventory.adjust",
  CATALOGUE_READ: "catalogue.read",
  CATALOGUE_WRITE: "catalogue.write",
  PAYMENTS_READ: "payments.read",
  PAYMENTS_REFUND: "payments.refund",
  STAFF_READ: "staff.read",
  STAFF_MANAGE: "staff.manage",
  ROLES_MANAGE: "roles.manage",
  AUDIT_READ: "audit.read",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_CODES = {
  ADMIN: "admin",
  OPS: "ops",
  SUPPORT: "support",
  ANALYST: "analyst",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  admin: Object.values(PERMISSIONS),
  ops: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.CATALOGUE_READ,
    PERMISSIONS.CATALOGUE_WRITE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_REFUND,
  ],
  support: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PAYMENTS_READ,
  ],
  analyst: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CATALOGUE_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.AUDIT_READ,
  ],
};
