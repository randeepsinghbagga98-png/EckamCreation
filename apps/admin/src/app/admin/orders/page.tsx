"use client";

import Link from "next/link";
import { useState } from "react";
import { adminRequest } from "@/lib/api/client";
import { formatDate, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Button, Card, EmptyState, ErrorState, PageHeader, StatusPill, inputClass } from "@/components/ui";

type OrderRow = {
  id: string;
  number: string;
  status: string;
  currencyCode: string;
  total: { amountMinor: string; currencyCode: string };
  placedAt: string;
  itemCount: number;
};

export default function AdminOrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const orders = useAsync(
    () =>
      adminRequest<{ items: OrderRow[] }>("/v1/admin/orders", {
        search: { q, status, cursor, limit: 20 },
      }),
    [q, status, cursor].join("|"),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Orders are listed from OrderService. Only supported status changes are available on the detail page."
      />
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Search by order number"
            value={q}
            onChange={(event) => {
              setCursor(undefined);
              setQ(event.target.value);
            }}
          />
          <select
            className={inputClass}
            value={status}
            onChange={(event) => {
              setCursor(undefined);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            {["PENDING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED", "CANCELLED"].map(
              (value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ),
            )}
          </select>
        </div>
      </Card>
      {orders.loading ? <Card>Loading orders…</Card> : null}
      {orders.error ? <ErrorState message={orders.error} onRetry={orders.reload} /> : null}
      {orders.data && orders.data.data.items.length === 0 ? (
        <EmptyState title="No orders" body="Orders will appear here when customers complete checkout." />
      ) : null}
      {orders.data && orders.data.data.items.length > 0 ? (
        <Card>
          <div className="admin-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                <tr>
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Placed</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.data.items.map((order) => (
                  <tr key={order.id} className="border-t border-ec-line">
                    <td className="py-3">
                      <Link href={`/admin/orders/${order.id}`} className="text-ec-ivory hover:text-ec-gold">
                        {order.number}
                      </Link>
                    </td>
                    <td>{formatDate(order.placedAt)}</td>
                    <td>
                      <StatusPill value={order.status} />
                    </td>
                    <td>{order.itemCount}</td>
                    <td>{formatMoney(order.total.amountMinor, order.total.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.data.pagination?.hasMore ? (
            <div className="mt-4">
              <Button variant="ghost" onClick={() => setCursor(orders.data?.pagination?.nextCursor ?? undefined)}>
                Load more
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
