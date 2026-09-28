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
