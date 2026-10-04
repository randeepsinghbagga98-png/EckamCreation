"use client";

import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <ProductForm
      mode="create"
      onSaved={(id) => router.push(`/admin/products/${id}`)}
    />
  );
}
