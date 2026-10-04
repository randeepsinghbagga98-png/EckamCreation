"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/errors";
import { fetchStaffSession, staffLogin } from "@/lib/auth/session";
import { Button, Field, inputClass } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await staffLogin(email, password);
      const session = await fetchStaffSession();
      if (!session) {
        setError("Sign in required.");
        return;
      }
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-app flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-ec-line bg-ec-panel/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <p className="text-[11px] font-semibold tracking-[0.22em] text-ec-gold uppercase">
          Eckam Creation
        </p>
        <h1 className="mt-2 font-serif text-4xl text-ec-ivory">Staff sign in</h1>
        <p className="mt-2 text-sm text-ec-muted">
          Admin access is separate from customer accounts.
        </p>
        <div className="mt-8 space-y-4">
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
        </div>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        <div className="mt-6">
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in" : "Enter console"}
          </Button>
        </div>
      </form>
    </div>
  );
}
