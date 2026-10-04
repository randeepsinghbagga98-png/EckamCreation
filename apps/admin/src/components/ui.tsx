import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-ec-gold uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-3xl text-ec-ivory sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-ec-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-ec-line bg-ec-panel/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const styles = {
    primary: "bg-ec-gold text-ec-black hover:bg-ec-gold-light",
    ghost: "border border-ec-line bg-transparent text-ec-champagne hover:border-ec-gold",
    danger: "border border-red-500/40 bg-red-950/40 text-red-100 hover:bg-red-900/40",
  } as const;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold tracking-[0.16em] text-ec-champagne uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ec-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-ec-line bg-ec-black px-3 py-2.5 text-sm text-ec-ivory outline-none transition focus:border-ec-gold";

export function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-ec-line px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-ec-champagne uppercase">
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <p className="font-serif text-2xl text-ec-ivory">{title}</p>
      <p className="mt-2 max-w-xl text-sm text-ec-muted">{body}</p>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-red-500/30">
      <p className="font-serif text-2xl text-ec-ivory">Unable to load</p>
      <p className="mt-2 text-sm text-ec-muted">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} />;
}

export function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-ec-gold/30 bg-ec-gold/8 px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-ec-gold uppercase">{title}</p>
      <p className="mt-1 text-sm text-ec-champagne">{body}</p>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-ec-line bg-ec-panel p-6">
        <h2 className="font-serif text-2xl text-ec-ivory">{title}</h2>
        <p className="mt-2 text-sm text-ec-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-full border border-ec-gold/40 bg-ec-black px-4 py-2 text-sm text-ec-champagne shadow-lg">
      {message}
    </div>
  );
}
