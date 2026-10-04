import { AccountGate } from '@/components/account/account-gate';
import { AccountOverview } from '@/components/account/account-overview';
import { AccountView } from '@/components/account/account-view';

export default function AccountPage() {
  return (
    <AccountGate>
      <AccountView>
        <AccountOverview />
      </AccountView>
    </AccountGate>
  );
}
