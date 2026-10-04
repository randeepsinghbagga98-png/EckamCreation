import type { Metadata } from 'next';
import { AccountLoginForm } from '@/components/account/account-login-form';
import { safeReturnTo } from '@/lib/auth/return-to';

export const metadata: Metadata = {
  title: 'Sign In | ECKAM CREATION',
  description: 'Sign in to your Eckam Creation account.',
};

type AccountLoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountLoginPage({ searchParams }: AccountLoginPageProps) {
  const next = safeReturnTo((await searchParams).next);
  return <AccountLoginForm next={next} />;
}
