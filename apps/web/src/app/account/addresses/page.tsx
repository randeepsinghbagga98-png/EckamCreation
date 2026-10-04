import { AccountAddresses } from '@/components/account/account-addresses';
import { AccountGate } from '@/components/account/account-gate';
import { AccountView } from '@/components/account/account-view';

export default function AccountAddressesPage() {
  return (
    <AccountGate>
      <AccountView>
        <AccountAddresses />
      </AccountView>
    </AccountGate>
  );
}
