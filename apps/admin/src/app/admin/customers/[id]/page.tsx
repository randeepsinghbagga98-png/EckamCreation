"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { AdminCustomerDetailDto } from "@eckamcreation/api-contracts";
import { adminData, adminRequest } from "@/lib/api/client";
import { formatDate, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Card, ErrorState, PageHeader, Skeleton, StatusPill } from "@/components/ui";

type OrderRow = {
  id: string;
  number: string;
  status: string;
  total: { amountMinor: string; currencyCode: string };
  placedAt: string;
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customer = useAsync(
    () => adminData<AdminCustomerDetailDto>(`/v1/admin/customers/${params.id}`),
    params.id,
  );
  const orders = useAsync(
    () =>
      adminRequest<{ items: OrderRow[] }>("/v1/admin/orders", {
        search: { userId: params.id, limit: 20 },
      }).then((r) => r.data.items),
    `orders:${params.id}`,
  );

  if (customer.loading) return <Skeleton className="h-96" />;
  if (customer.error) return <ErrorState message={customer.error} onRetry={customer.reload} />;
  if (!customer.data) return null;

  const record = customer.data;

  return (
    <div>
      <PageHeader
        eyebrow="Customer"
        title={record.name || record.email || "Customer"}
        description="Sensitive credentials are excluded by the admin customer contract."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-serif text-2xl">Profile</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ec-muted">Email</dt>
              <dd>{record.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ec-muted">Phone</dt>
              <dd>{record.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ec-muted">Locale</dt>
              <dd>{record.locale ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ec-muted">Created</dt>
              <dd>{formatDate(record.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ec-muted">Account</dt>
              <dd>
                <StatusPill value={record.deletedAt ? "DISABLED" : "ACTIVE"} />
              </dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-4 font-serif text-2xl">Addresses</h2>
          {record.addresses.length === 0 ? (
            <p className="text-sm text-ec-muted">No saved addresses.</p>
          ) : (
            <div className="space-y-3">
              {record.addresses.map((address) => (
                <div key={address.id} className="rounded-xl border border-ec-line px-3 py-3 text-sm">
                  <p>{address.fullName}</p>
                  <p className="text-ec-muted">
                    {address.city} · {address.type}
                    {address.isDefault ? " · Default" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 font-serif text-2xl">Orders</h2>
        {orders.loading ? <p className="text-sm text-ec-muted">Loading orders…</p> : null}
        {orders.data && orders.data.length === 0 ? (
          <p className="text-sm text-ec-muted">This customer has no orders.</p>
        ) : null}
        {orders.data && orders.data.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                <tr>
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Placed</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((order) => (
                  <tr key={order.id} className="border-t border-ec-line">
                    <td className="py-3">
                      <Link href={`/admin/orders/${order.id}`} className="hover:text-ec-gold">
                        {order.number}
                      </Link>
                    </td>
                    <td>{formatDate(order.placedAt)}</td>
                    <td>
                      <StatusPill value={order.status} />
                    </td>
                    <td>{formatMoney(order.total.amountMinor, order.total.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
