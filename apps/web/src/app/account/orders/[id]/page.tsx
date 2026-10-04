import type { Metadata } from 'next';
import { AccountGate } from '@/components/account/account-gate';
import { AccountOrderDetail } from '@/components/account/account-order-detail';
import { AccountView } from '@/components/account/account-view';

type AccountOrderPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AccountOrderPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order ${decodeURIComponent(id)} | ECKAM CREATION`,
  };
}

export default async function AccountOrderPage({ params }: AccountOrderPageProps) {
  const { id } = await params;

  return (
    <AccountGate>
      <AccountView>
        <AccountOrderDetail idOrNumber={decodeURIComponent(id)} />
      </AccountView>
    </AccountGate>
  );
}
