"use client";

import type { AdminPaymentIntentDto } from "@eckamcreation/api-contracts";
import { adminRequest } from "@/lib/api/client";
import { formatDate, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Card, EmptyState, ErrorState, Notice, PageHeader, StatusPill } from "@/components/ui";

type PaymentsPayload = {
  items: AdminPaymentIntentDto[];
  providerConfigured: boolean;
};

export default function AdminPaymentsPage() {
  const payments = useAsync(
    () => adminRequest<PaymentsPayload>("/v1/admin/payments/intents", { search: { limit: 20 } }),
  );

  if (payments.loading) return <Card>Loading payment records…</Card>;
  if (payments.error) return <ErrorState message={payments.error} onRetry={payments.reload} />;
  if (!payments.data) return null;

  const { items, providerConfigured } = payments.data.data;

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Payment Core"
        description="Real payment intents only. No provider sandbox or invented success records."
      />
      {!providerConfigured ? (
        <div className="mb-6">
          <Notice
            title="Payment provider is not configured."
            body="The Payment Core can still store intents. Live capture will remain unavailable until a real provider is selected."
          />
        </div>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          title="No payment intents"
          body="Payment Core records will appear here when checkout creates an intent."
        />
      ) : (
        <Card>
          <div className="admin-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                <tr>
                  <th className="pb-3">Intent</th>
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((intent) => (
                  <tr key={intent.id} className="border-t border-ec-line">
                    <td className="py-3">
                      <p className="font-mono text-xs">{intent.id}</p>
                      <p className="text-xs text-ec-muted">{intent.orderId ?? "No order yet"}</p>
                    </td>
                    <td>{intent.provider}</td>
                    <td>
                      <StatusPill value={intent.status} />
                    </td>
                    <td>{formatMoney(intent.amount.amountMinor, intent.amount.currencyCode)}</td>
                    <td>{formatDate(intent.createdAt)}</td>
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
