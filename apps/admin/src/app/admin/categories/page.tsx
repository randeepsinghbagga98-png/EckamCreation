"use client";

import { useState } from "react";
import type { CategoryDto } from "@eckamcreation/api-contracts";
import { adminData, adminRequest } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { slugify } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  StatusPill,
  Toast,
  inputClass,
} from "@/components/ui";

export default function AdminCategoriesPage() {
  const list = useAsync(
    () => adminRequest<{ items: CategoryDto[] }>("/v1/admin/categories").then((r) => r.data.items),
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(category: CategoryDto) {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description ?? "");
    setIsActive(category.isActive);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { name, slug, description: description || null, isActive };
      if (editingId) {
        await adminData(`/v1/admin/categories/${editingId}`, { method: "PATCH", body });
        setToast("Category updated");
      } else {
        await adminData("/v1/admin/categories", { method: "POST", body });
        setToast("Category created");
      }
      setEditingId(null);
      setName("");
      setSlug("");
      setDescription("");
      setIsActive(true);
      await list.reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to save category.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="Create and publish categories using the existing CategoryService."
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="mb-4 font-serif text-2xl">{editingId ? "Edit category" : "New category"}</h2>
          <div className="space-y-4">
            <Field label="Name">
              <input
                className={inputClass}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!editingId) setSlug(slugify(event.target.value));
                }}
              />
            </Field>
            <Field label="Slug">
              <input className={inputClass} value={slug} onChange={(event) => setSlug(event.target.value)} />
            </Field>
            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-24`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ec-champagne">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Published
            </label>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving" : editingId ? "Update category" : "Create category"}
            </Button>
          </div>
        </Card>
        <div>
          {list.loading ? <Card>Loading categories…</Card> : null}
          {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}
          {list.data && list.data.length === 0 ? (
            <EmptyState title="No categories" body="Create the first category to organize the catalogue." />
          ) : null}
          {list.data && list.data.length > 0 ? (
            <Card>
              <div className="admin-table-wrap">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] tracking-[0.14em] text-ec-muted uppercase">
                    <tr>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.map((category) => (
                      <tr key={category.id} className="border-t border-ec-line">
                        <td className="py-3">
                          <p>{category.name}</p>
                          <p className="text-xs text-ec-muted">{category.slug}</p>
                        </td>
                        <td>
                          <StatusPill value={category.isActive ? "PUBLISHED" : "HIDDEN"} />
                        </td>
                        <td className="text-right">
                          <Button variant="ghost" onClick={() => startEdit(category)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
