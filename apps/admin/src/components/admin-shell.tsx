"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isUnauthorized } from "@/lib/api/errors";
import { fetchStaffSession, staffLogout, type StaffSession } from "@/lib/auth/session";
import { environmentLabel } from "@/lib/format";

const NAV = [
  { href: "/admin", label: "Dashboard", match: (path: string) => path === "/admin" },
  { href: "/admin/products", label: "Products", match: (path: string) => path.startsWith("/admin/products") },
  { href: "/admin/categories", label: "Categories", match: (path: string) => path.startsWith("/admin/categories") },
  { href: "/admin/orders", label: "Orders", match: (path: string) => path.startsWith("/admin/orders") },
  { href: "/admin/customers", label: "Customers", match: (path: string) => path.startsWith("/admin/customers") },
  { href: "/admin/payments", label: "Payments", match: (path: string) => path.startsWith("/admin/payments") },
  { href: "/admin/shipments", label: "Shipments", match: (path: string) => path.startsWith("/admin/shipments") },
  { href: "/admin/settings", label: "Settings", match: (path: string) => path.startsWith("/admin/settings") },
  { href: "/admin/ai", label: "AI", match: (path: string) => path.startsWith("/admin/ai") },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStaffSession()
      .then((next) => {
        if (cancelled) return;
        if (!next) {
          router.replace("/admin/login");
          return;
        }
        setSession(next);
        setReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (isUnauthorized(error)) {
          router.replace("/admin/login");
          return;
        }
        router.replace("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  async function onLogout() {
    await staffLogout();
    router.replace("/admin/login");
  }

  if (!ready || !session) {
    return (
      <div className="admin-app flex min-h-screen items-center justify-center">
        <p className="text-sm tracking-[0.18em] text-ec-champagne uppercase">Opening console</p>
      </div>
    );
  }

  return (
    <div className="admin-app overflow-x-hidden">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-ec-line bg-ec-black/95 p-6 transition-transform lg:static lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <p className="font-serif text-2xl text-ec-ivory">Eckam</p>
          <p className="mt-1 text-[11px] tracking-[0.22em] text-ec-gold uppercase">Admin console</p>
          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "bg-ec-gold/15 text-ec-gold"
                      : "text-ec-muted hover:bg-white/5 hover:text-ec-ivory"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            className="mt-8 text-left text-sm text-ec-champagne hover:text-ec-gold"
          >
            Logout
          </button>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-ec-line px-4 py-4 sm:px-8">
            <button
              type="button"
              className="rounded-full border border-ec-line px-3 py-1 text-xs tracking-[0.16em] text-ec-champagne uppercase lg:hidden"
              onClick={() => setOpen((value) => !value)}
            >
              Menu
            </button>
            <div className="hidden lg:block">
              <p className="text-[11px] tracking-[0.18em] text-ec-muted uppercase">Staff</p>
              <p className="text-sm text-ec-ivory">{session.name || session.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-ec-gold/30 px-3 py-1 text-[10px] tracking-[0.16em] text-ec-gold uppercase">
                {environmentLabel(process.env.NODE_ENV)}
              </span>
              <span className="hidden text-sm text-ec-muted sm:inline">{session.email}</span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-ec-line px-3 py-1 text-xs tracking-[0.14em] text-ec-champagne uppercase"
              >
                Logout
              </button>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
