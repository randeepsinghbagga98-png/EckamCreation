import Link from 'next/link';

export function AccountAuthRequired() {
  return (
    <div className="account-page">
      <div className="account-shell">
        <div className="account-welcome" role="status">
          <p className="account-kicker">Welcome to Eckam</p>
          <h1 className="account-title">Sign in to continue.</h1>
          <p className="account-copy">
            Sign in to manage your account, addresses and orders.
          </p>
          <div className="account-actions">
            <Link href="/account/login" className="cart-cta cart-cta--primary">
              Sign in
            </Link>
            <Link href="/account/signup" className="cart-cta cart-cta--ghost">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
