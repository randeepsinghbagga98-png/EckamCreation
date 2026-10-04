import { AccountGate } from '@/components/account/account-gate';
import { AccountProfile } from '@/components/account/account-profile';
import { AccountView } from '@/components/account/account-view';

export default function AccountProfilePage() {
  return (
    <AccountGate>
      <AccountView>
        <AccountProfile />
      </AccountView>
    </AccountGate>
  );
}
