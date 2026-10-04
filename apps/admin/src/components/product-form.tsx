"use client";

import { useState } from "react";
import type { CategoryDto, ProductDetailDto } from "@eckamcreation/api-contracts";
import { adminData, adminRequest } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { formatMoney, slugify } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import {
  Button,
  Card,
  ConfirmDialog,
  Field,
  PageHeader,
  StatusPill,
  Toast,
  inputClass,
} from "@/components/ui";

type Props = {
  mode: "create" | "edit";
  product?: ProductDetailDto;
  onSaved: (id: string) => void;
};

export function ProductForm({ mode, product, onSaved }: Props) {
  const categories = useAsync(
    () => adminRequest<{ items: CategoryDto[] }>("/v1/admin/categories").then((r) => r.data.items),
  );
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [status, setStatus] = useState(product?.status ?? "DRAFT");
  const [categoryId, setCategoryId] = useState(product?.categories[0]?.id ?? "");
  const [sku, setSku] = useState(product?.variants[0]?.sku ?? "");
  const [variantName, setVariantName] = useState(product?.variants[0]?.name ?? "");
  const [price, setPrice] = useState(
    product?.variants[0]?.price?.amountMinor
      ? String(Number(product.variants[0].price.amountMinor) / 100)
      : "",
  );
  const [currency, setCurrency] = useState(product?.variants[0]?.price?.currencyCode ?? "INR");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"publish" | "unpublish" | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name,
        slug,
        description: description || undefined,
        status: status as "DRAFT" | "ACTIVE" | "ARCHIVED",
        categoryIds: categoryId ? [categoryId] : [],
        primaryCategoryId: categoryId || undefined,
      };
      let saved = product;
      if (mode === "create") {
        saved = await adminData<ProductDetailDto>("/v1/admin/products", {
          method: "POST",
          body: payload,
        });
        if (sku) {
          const variant = await adminData<{ id: string }>(`/v1/admin/products/${saved.id}/variants`, {
            method: "POST",
            body: { sku, name: variantName || name, isDefault: true, isActive: true },
          });
          if (price) {
            const amountMinor = String(Math.round(Number(price) * 100));
            await adminData(`/v1/admin/variants/${variant.id}/prices`, {
              method: "PUT",
              body: { currencyCode: currency, amountMinor },
            });
          }
        }
      } else if (product) {
        saved = await adminData<ProductDetailDto>(`/v1/admin/products/${product.id}`, {
          method: "PATCH",
          body: payload,
        });
        const existing = product.variants[0];
        if (existing && price) {
          const amountMinor = String(Math.round(Number(price) * 100));
          await adminData(`/v1/admin/variants/${existing.id}/prices`, {
            method: "PUT",
            body: { currencyCode: currency, amountMinor },
          });
        }
      }
      if (!saved) throw new Error("Product could not be saved.");
      setToast("Product saved");
      onSaved(saved.id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to save product.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish() {
    if (!product) return;
    setBusy(true);
    try {
      const path =
        confirm === "unpublish"
          ? `/v1/admin/products/${product.id}/unpublish`
          : `/v1/admin/products/${product.id}/publish`;
      await adminData(path, { method: "POST" });
      setToast(confirm === "unpublish" ? "Product unpublished" : "Product published");
      setConfirm(null);
      onSaved(product.id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to update publish state.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title={mode === "create" ? "New product" : product?.name ?? "Product"}
        description="Required fields follow the existing product contract. Price is stored on the variant."
        actions={
          mode === "edit" && product ? (
            product.status === "ACTIVE" ? (
              <Button variant="ghost" onClick={() => setConfirm("unpublish")}>
                Unpublish
              </Button>
            ) : (
              <Button onClick={() => setConfirm("publish")}>Publish</Button>
            )
          ) : null
        }
      />
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (mode === "create") setSlug(slugify(event.target.value));
              }}
              required
            />
          </Field>
          <Field label="Slug">
            <input className={inputClass} value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
          <Field label="Category">
            <select className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Select category</option>
              {(categories.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-28`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="grid gap-4">
            <Field label="Default variant SKU">
              <input
                className={inputClass}
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                disabled={mode === "edit"}
              />
            </Field>
            <Field label="Variant name">
              <input
                className={inputClass}
                value={variantName}
                onChange={(event) => setVariantName(event.target.value)}
                disabled={mode === "edit"}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </Field>
              <Field label="Currency">
                <input
                  className={inputClass}
                  value={currency}
                  maxLength={3}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                />
              </Field>
            </div>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        <div className="mt-6">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Saving" : "Save product"}
          </Button>
        </div>
      </Card>
      {product ? (
        <Card className="mt-6">
          <h2 className="mb-4 font-serif text-2xl">Variants</h2>
          {product.variants.length === 0 ? (
            <p className="text-sm text-ec-muted">No variants yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                  <tr>
                    <th className="pb-3">SKU</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => (
                    <tr key={variant.id} className="border-t border-ec-line">
                      <td className="py-3">{variant.sku}</td>
                      <td>{variant.name || "—"}</td>
                      <td>{formatMoney(variant.price?.amountMinor, variant.price?.currencyCode)}</td>
                      <td>
                        <StatusPill value={variant.isActive ? "ACTIVE" : "INACTIVE"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "unpublish" ? "Unpublish product?" : "Publish product?"}
        body="This uses the existing catalogue publish flow. The storefront will only show active published products."
        confirmLabel={confirm === "unpublish" ? "Unpublish" : "Publish"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void togglePublish()}
      />
      <Toast message={toast} />
    </div>
  );
}
