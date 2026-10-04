import { AccountGate } from '@/components/account/account-gate';
import { AccountOrders } from '@/components/account/account-orders';
import { AccountView } from '@/components/account/account-view';

export default function AccountOrdersPage() {
  return (
    <AccountGate>
      <AccountView>
        <AccountOrders />
      </AccountView>
    </AccountGate>
  );
}
