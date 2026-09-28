import type { PrismaClient } from "@eckamcreation/database";
import type { AdminDashboardDto } from "@eckamcreation/api-contracts";

const PENDING_ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED"] as const;
const COMPLETED_ORDER_STATUSES = ["DELIVERED"] as const;
const CANCELLED_ORDER_STATUSES = ["CANCELLED"] as const;

/**
 * Aggregate metrics for the admin control center.
 * Uses Prisma groupBy / count — never loads full tables.
 */
export class DashboardService {
  constructor(private readonly prisma: PrismaClient) {}

  async getMetrics(): Promise<AdminDashboardDto> {
    const [
      productsTotal,
      productsActive,
      productsDraft,
      customersTotal,
      ordersTotal,
      ordersPending,
      ordersCompleted,
      ordersCancelled,
      salesRows,
      shipmentGroups,
      paymentGroups,
    ] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      this.prisma.product.count({ where: { deletedAt: null, status: "DRAFT" } }),
      this.prisma.user.count({
        where: { deletedAt: null, profile: { isNot: null } },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: { in: [...PENDING_ORDER_STATUSES] } } }),
      this.prisma.order.count({ where: { status: { in: [...COMPLETED_ORDER_STATUSES] } } }),
      this.prisma.order.count({ where: { status: { in: [...CANCELLED_ORDER_STATUSES] } } }),
      this.prisma.order.groupBy({
        by: ["currencyCode"],
        where: { status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
        _sum: { totalMinor: true },
        _count: { _all: true },
      }),
      this.prisma.shipment.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.paymentIntent.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    return {
      products: {
        total: productsTotal,
        active: productsActive,
        draft: productsDraft,
      },
      customers: { total: customersTotal },
      orders: {
        total: ordersTotal,
        pending: ordersPending,
        completed: ordersCompleted,
        cancelled: ordersCancelled,
      },
      sales: salesRows.map((row) => ({
        currencyCode: row.currencyCode,
        totalMinor: (row._sum.totalMinor ?? BigInt(0)).toString(),
        orderCount: row._count._all,
      })),
      shipmentsByStatus: shipmentGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      paymentsByStatus: paymentGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
    };
  }
}
