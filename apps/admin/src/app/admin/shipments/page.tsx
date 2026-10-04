"use client";

import Link from "next/link";
import { adminRequest } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, Notice, PageHeader, StatusPill } from "@/components/ui";

type ShipmentRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
};

export default function AdminShipmentsPage() {
  const shipments = useAsync(
    () => adminRequest<{ items: ShipmentRow[] }>("/v1/admin/shipments", { search: { limit: 20 } }),
  );

  if (shipments.loading) return <Card>Loading shipments…</Card>;
  if (shipments.error) return <ErrorState message={shipments.error} onRetry={shipments.reload} />;
  if (!shipments.data) return null;

  const items = shipments.data.data.items;

  return (
    <div>
      <PageHeader
        eyebrow="Fulfillment"
        title="Shipments"
        description="Only shipment records already stored by OrderService are shown. Courier data is never invented."
      />
      {items.length === 0 ? (
        <div className="space-y-4">
          <Notice
            title="No shipment records yet."
            body="Shipment management is available through existing order shipment APIs. Tracking appears only after a real shipment is created."
          />
          <EmptyState
            title="Shipment management is not configured."
            body="There are no live shipment records. Create shipments from a paid order using the existing backend when fulfillment starts."
          />
        </div>
      ) : (
        <Card>
          <div className="admin-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                <tr>
                  <th className="pb-3">Shipment</th>
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Carrier</th>
                  <th className="pb-3">Tracking</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((shipment) => (
                  <tr key={shipment.id} className="border-t border-ec-line">
                    <td className="py-3 font-mono text-xs">{shipment.id}</td>
                    <td>
                      <Link href={`/admin/orders/${shipment.orderId}`} className="hover:text-ec-gold">
                        {shipment.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <StatusPill value={shipment.status} />
                    </td>
                    <td>{shipment.carrier ?? "—"}</td>
                    <td>{shipment.trackingNumber ?? "—"}</td>
                    <td>{formatDate(shipment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
