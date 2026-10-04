import Link from 'next/link';

type AccountEmptyStateProps = {
  kicker: string;
  title: string;
  copy: string;
  actionHref?: string;
  actionLabel?: string;
};

export function AccountEmptyState({
  kicker,
  title,
  copy,
  actionHref,
  actionLabel,
}: AccountEmptyStateProps) {
  return (
    <div className="account-empty" role="status">
      <p className="account-kicker">{kicker}</p>
      <h2 className="account-empty-title">{title}</h2>
      <p className="account-copy">{copy}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="cart-cta cart-cta--primary mt-8">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
