import { AccountGate } from '@/components/account/account-gate';
import { AccountView } from '@/components/account/account-view';
import { AccountWishlist } from '@/components/account/account-wishlist';

export default function AccountWishlistPage() {
  return (
    <AccountGate>
      <AccountView>
        <AccountWishlist />
      </AccountView>
    </AccountGate>
  );
}
