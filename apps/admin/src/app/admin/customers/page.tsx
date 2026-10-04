"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminCustomerSummaryDto } from "@eckamcreation/api-contracts";
import { adminRequest } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Button, Card, EmptyState, ErrorState, PageHeader, inputClass } from "@/components/ui";

export default function AdminCustomersPage() {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const customers = useAsync(
    () =>
      adminRequest<{ items: AdminCustomerSummaryDto[] }>("/v1/admin/customers", {
        search: { q, cursor, limit: 20 },
      }),
    [q, cursor].join("|"),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Accounts"
        title="Customers"
        description="Customer records from CustomerService. Passwords and session tokens are never returned."
      />
      <Card className="mb-6">
        <input
          className={inputClass}
          placeholder="Search name, email, or phone"
          value={q}
          onChange={(event) => {
            setCursor(undefined);
            setQ(event.target.value);
          }}
        />
      </Card>
      {customers.loading ? <Card>Loading customers…</Card> : null}
      {customers.error ? <ErrorState message={customers.error} onRetry={customers.reload} /> : null}
      {customers.data && customers.data.data.items.length === 0 ? (
        <EmptyState title="No customers" body="Customer accounts will appear after storefront registration." />
      ) : null}
      {customers.data && customers.data.data.items.length > 0 ? (
        <Card>
          <div className="admin-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                <tr>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Orders</th>
                </tr>
              </thead>
              <tbody>
                {customers.data.data.items.map((customer) => (
                  <tr key={customer.id} className="border-t border-ec-line">
                    <td className="py-3">
                      <Link href={`/admin/customers/${customer.id}`} className="text-ec-ivory hover:text-ec-gold">
                        {customer.name || customer.email || "Customer"}
                      </Link>
                      <p className="text-xs text-ec-muted">{customer.email}</p>
                    </td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>{customer.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customers.data.pagination?.hasMore ? (
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setCursor(customers.data?.pagination?.nextCursor ?? undefined)}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
