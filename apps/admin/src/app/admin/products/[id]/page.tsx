"use client";

import { useParams } from "next/navigation";
import type { ProductDetailDto } from "@eckamcreation/api-contracts";
import { adminData } from "@/lib/api/client";
import { useAsync } from "@/lib/use-async";
import { ErrorState, Skeleton } from "@/components/ui";
import { ProductForm } from "@/components/product-form";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading, reload } = useAsync(
    () => adminData<ProductDetailDto>(`/v1/admin/products/${params.id}`),
    params.id,
  );

  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <ProductForm mode="edit" product={data} onSaved={() => reload()} />;
}
