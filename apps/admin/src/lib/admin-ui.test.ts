import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin UI states", () => {
  it("uses overflow-safe shell styles for desktop, tablet, and mobile", () => {
    const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain(".admin-table-wrap");
    expect(css).toContain("@media (max-width: 767px)");
  });

  it("provides loading, empty, and error primitives", () => {
    const ui = readFileSync(resolve(__dirname, "../components/ui.tsx"), "utf8");
    expect(ui).toContain("export function EmptyState");
    expect(ui).toContain("export function ErrorState");
    expect(ui).toContain("export function Skeleton");
    expect(ui).toContain("export function ConfirmDialog");
  });
});
