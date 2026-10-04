"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { OrderDto } from "@eckamcreation/api-contracts";
import { adminData } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusPill,
  Toast,
  inputClass,
} from "@/components/ui";

const NEXT_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading, reload } = useAsync(
    () => adminData<OrderDto>(`/v1/admin/orders/${params.id}`),
    params.id,
  );
  const [nextStatus, setNextStatus] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function applyStatus() {
    if (!data || !nextStatus) return;
    try {
      await adminData(`/v1/admin/orders/${data.id}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      setToast("Order status updated");
      setConfirm(false);
      await reload();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Unsupported status change was rejected.");
      setConfirm(false);
    }
  }

  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Order"
        title={data.number}
        description={`Placed ${formatDate(data.placedAt)}`}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-4 font-serif text-2xl">Items</h2>
          <div className="admin-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                <tr>
                  <th className="pb-3">Item</th>
                  <th className="pb-3">Qty</th>
                  <th className="pb-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-ec-line">
                    <td className="py-3">
                      <p>{item.productName}</p>
                      <p className="text-xs text-ec-muted">{item.sku}</p>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.total.amountMinor, item.total.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Status</p>
            <div className="mt-2">
              <StatusPill value={data.status} />
            </div>
            <p className="mt-4 text-[11px] tracking-[0.16em] text-ec-muted uppercase">Payment</p>
            <p className="mt-1 text-sm">{data.paymentStatus ?? "—"}</p>
            <p className="mt-4 text-[11px] tracking-[0.16em] text-ec-muted uppercase">Total</p>
            <p className="mt-1 font-serif text-3xl">
              {formatMoney(data.total.amountMinor, data.total.currencyCode)}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Customer</p>
            <p className="mt-2 text-sm">{data.customerEmail ?? "—"}</p>
            <p className="text-sm text-ec-muted">{data.customerPhone ?? ""}</p>
            {data.shippingAddress ? (
              <p className="mt-3 text-sm text-ec-champagne">
                {data.shippingAddress.fullName}, {data.shippingAddress.city}
              </p>
            ) : null}
            <Link href="/admin/customers" className="mt-3 inline-block text-xs text-ec-gold uppercase">
              Customer records
            </Link>
          </Card>
          <Card>
            <p className="mb-3 text-[11px] tracking-[0.16em] text-ec-muted uppercase">
              Supported status change
            </p>
            <select className={inputClass} value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
              <option value="">Select status</option>
              {NEXT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            {actionError ? <p className="mt-3 text-sm text-red-300">{actionError}</p> : null}
            <div className="mt-4">
              <Button disabled={!nextStatus} onClick={() => setConfirm(true)}>
                Update status
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Update order status?"
        body="Only transitions allowed by OrderService will succeed. Unsupported mutations are rejected by the API."
        onCancel={() => setConfirm(false)}
        onConfirm={() => void applyStatus()}
      />
      <Toast message={toast} />
    </div>
  );
}
