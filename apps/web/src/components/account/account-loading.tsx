export function AccountLoading() {
  return (
    <div className="account-page" aria-busy="true" aria-live="polite">
      <div className="account-shell">
        <div className="account-heading">
          <div className="account-skeleton account-skeleton--kicker" />
          <div className="account-skeleton account-skeleton--title" />
          <div className="account-skeleton account-skeleton--copy" />
        </div>
        <div className="account-layout">
          <aside className="account-sidebar" aria-hidden="true">
            <div className="account-skeleton account-skeleton--nav" />
            <div className="account-skeleton account-skeleton--nav" />
            <div className="account-skeleton account-skeleton--nav" />
            <div className="account-skeleton account-skeleton--nav" />
          </aside>
          <div className="account-panel">
            <div className="account-skeleton account-skeleton--card" />
            <div className="account-skeleton account-skeleton--card" />
          </div>
        </div>
      </div>
    </div>
  );
}
