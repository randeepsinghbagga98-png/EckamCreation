"use client";

import Link from "next/link";
import { useState } from "react";
import type { CategoryDto, ProductSummaryDto } from "@eckamcreation/api-contracts";
import { adminRequest } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Button, Card, EmptyState, ErrorState, PageHeader, StatusPill, inputClass } from "@/components/ui";

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const categories = useAsync(
    () => adminRequest<{ items: CategoryDto[] }>("/v1/admin/categories").then((r) => r.data.items),
  );
  const products = useAsync(
    () =>
      adminRequest<{ items: ProductSummaryDto[] }>("/v1/admin/products", {
        search: { q, category, status, cursor, limit: 20 },
      }),
    [q, category, status, cursor].join("|"),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Search, filter, and manage products from the live catalogue service."
        actions={
          <Link href="/admin/products/new">
            <Button>New product</Button>
          </Link>
        }
      />
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className={inputClass}
            placeholder="Search name or slug"
            value={q}
            onChange={(event) => {
              setCursor(undefined);
              setQ(event.target.value);
            }}
          />
          <select
            className={inputClass}
            value={category}
            onChange={(event) => {
              setCursor(undefined);
              setCategory(event.target.value);
            }}
          >
            <option value="">All categories</option>
            {(categories.data ?? []).map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={status}
            onChange={(event) => {
              setCursor(undefined);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </Card>
      {products.loading ? <Card>Loading products…</Card> : null}
      {products.error ? <ErrorState message={products.error} onRetry={products.reload} /> : null}
      {products.data && products.data.data.items.length === 0 ? (
        <EmptyState title="No products" body="Create a product or adjust the current filters." />
      ) : null}
      {products.data && products.data.data.items.length > 0 ? (
        <Card>
          <div className="admin-table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                <tr>
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.data.data.items.map((product) => (
                  <tr key={product.id} className="border-t border-ec-line">
                    <td className="py-3">
                      <Link href={`/admin/products/${product.id}`} className="text-ec-ivory hover:text-ec-gold">
                        {product.name}
                      </Link>
                      <p className="text-xs text-ec-muted">{product.slug}</p>
                    </td>
                    <td>
                      <StatusPill value={product.status} />
                    </td>
                    <td>{formatMoney(product.price?.amountMinor, product.price?.currencyCode)}</td>
                    <td>{product.inStock ? "In stock" : "Out of stock"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.data.pagination?.hasMore ? (
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setCursor(products.data?.pagination?.nextCursor ?? undefined)}
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
