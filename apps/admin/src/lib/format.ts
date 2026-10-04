export function formatMoney(amountMinor?: string | null, currencyCode?: string | null): string {
  if (!amountMinor || !currencyCode) return "—";
  const value = Number(amountMinor) / 100;
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function environmentLabel(value?: string | null): string {
  if (value === "production") return "Production";
  if (value === "test") return "Test";
  return "Development";
}
