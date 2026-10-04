import type { ReactNode } from 'react';
import { AccountHeader } from './account-header';
import { AccountSidebar } from './account-sidebar';

type AccountViewProps = {
  title?: string;
  copy?: string;
  children: ReactNode;
};

export function AccountView({
  title = 'My account',
  copy = 'Manage your account, addresses and orders.',
  children,
}: AccountViewProps) {
  return (
    <div className="account-page">
      <div className="account-shell">
        <AccountHeader title={title} copy={copy} />
        <div className="account-layout">
          <AccountSidebar />
          <div className="account-main">{children}</div>
        </div>
      </div>
    </div>
  );
}
