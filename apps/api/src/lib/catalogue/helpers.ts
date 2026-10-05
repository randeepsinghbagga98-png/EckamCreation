import type { Prisma } from "@eckamcreation/database";

export function encodeCursor(payload: { id: string; createdAt: string }): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): { id: string; createdAt: Date } | null {
  if (!cursor) return null;
  try {
    const raw = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      id?: string;
      createdAt?: string;
    };
    if (!raw.id || !raw.createdAt) return null;
    const createdAt = new Date(raw.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { id: raw.id, createdAt };
  } catch {
    return null;
  }
}

export function clampLimit(limit: number | undefined, fallback = 20, max = 100): number {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(limit)));
}

export function publicProductWhere(): Prisma.ProductWhereInput {
  return {
    deletedAt: null,
    status: "ACTIVE",
  };
}

export function slugifyPath(parentPath: string | null | undefined, slug: string): string {
  const base = parentPath?.replace(/\/$/, "") || "";
  return `${base}/${slug}`.replace(/\/+/g, "/");
}

/** Escape a string for safe use inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rank catalogue search hits so whole-word / prefix matches beat substring hits
 * (e.g. query "bag" prefers "Noir Compact Bag" over "Black Handbag").
 */
export function scoreProductSearch(
  product: { name: string; slug: string },
  rawQuery: string,
): number {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;
  const name = product.name.toLowerCase();
  const slug = product.slug.toLowerCase();
  const slugWords = slug.replace(/-/g, " ");

  if (slug === query || name === query) return 1000;
  if (name.startsWith(query)) return 800;
  if (slug.startsWith(query) || slugWords.startsWith(query)) return 700;

  const word = new RegExp(`(^|[^a-z0-9])${escapeRegExp(query)}([^a-z0-9]|$)`, "i");
  if (word.test(name)) return 600;
  if (word.test(slugWords)) return 550;
  if (name.includes(query)) return 400;
  if (slug.includes(query) || slugWords.includes(query)) return 300;
  return 0;
}
