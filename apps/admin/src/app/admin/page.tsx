"use client";

import Link from "next/link";
import type { AdminCustomerSummaryDto, AdminDashboardDto } from "@eckamcreation/api-contracts";
import { adminData, adminRequest } from "@/lib/api/client";
import { formatDate, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, PageHeader, Skeleton, StatusPill } from "@/components/ui";

type RecentOrder = {
  id: string;
  number: string;
  status: string;
  currencyCode: string;
  total: { amountMinor: string; currencyCode: string };
  placedAt: string;
};

type DashboardBundle = {
  metrics: AdminDashboardDto;
  orders: RecentOrder[];
  customers: AdminCustomerSummaryDto[];
};

export default function AdminDashboardPage() {
  const { data, error, loading, reload } = useAsync<DashboardBundle>(async () => {
    const [metrics, orders, customers] = await Promise.all([
      adminData<AdminDashboardDto>("/v1/admin/dashboard"),
      adminRequest<{ items: RecentOrder[] }>("/v1/admin/orders", { search: { limit: 5 } }),
      adminRequest<{ items: AdminCustomerSummaryDto[] }>("/v1/admin/customers", {
        search: { limit: 5 },
      }),
    ]);
    return { metrics, orders: orders.data.items, customers: customers.data.items };
  });

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No dashboard data" body="Metrics will appear when catalogue and order records exist." />;

  const revenue = data.metrics.sales[0];
  const cards = [
    { label: "Products", value: String(data.metrics.products.total) },
    { label: "Active products", value: String(data.metrics.products.active) },
    { label: "Customers", value: String(data.metrics.customers.total) },
    { label: "Orders", value: String(data.metrics.orders.total) },
    { label: "Pending orders", value: String(data.metrics.orders.pending) },
    {
      label: "Revenue",
      value: revenue ? formatMoney(revenue.totalMinor, revenue.currencyCode) : "—",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live counts from the Eckam Creation database. Metrics that are not exposed by the API are omitted."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">{card.label}</p>
            <p className="mt-3 font-serif text-3xl text-ec-ivory">{card.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs tracking-[0.14em] text-ec-gold uppercase">
              View all
            </Link>
          </div>
          {data.orders.length === 0 ? (
            <p className="text-sm text-ec-muted">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ec-line px-3 py-3 hover:border-ec-gold/50"
                >
                  <div>
                    <p className="text-sm text-ec-ivory">{order.number}</p>
                    <p className="text-xs text-ec-muted">{formatDate(order.placedAt)}</p>
                  </div>
                  <div className="text-right">
                    <StatusPill value={order.status} />
                    <p className="mt-1 text-sm text-ec-champagne">
                      {formatMoney(order.total.amountMinor, order.total.currencyCode)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recent customers</h2>
            <Link href="/admin/customers" className="text-xs tracking-[0.14em] text-ec-gold uppercase">
              View all
            </Link>
          </div>
          {data.customers.length === 0 ? (
            <p className="text-sm text-ec-muted">No customers yet.</p>
          ) : (
            <div className="space-y-3">
              {data.customers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ec-line px-3 py-3 hover:border-ec-gold/50"
                >
                  <div>
                    <p className="text-sm text-ec-ivory">{customer.name || customer.email || "Customer"}</p>
                    <p className="text-xs text-ec-muted">{customer.email}</p>
                  </div>
                  <p className="text-xs text-ec-champagne">{customer.orderCount} orders</p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
