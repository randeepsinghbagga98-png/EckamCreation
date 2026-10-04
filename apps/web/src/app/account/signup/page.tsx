import type { Metadata } from 'next';
import { AccountSignupForm } from '@/components/account/account-signup-form';
import { safeReturnTo } from '@/lib/auth/return-to';

export const metadata: Metadata = {
  title: 'Create Account | ECKAM CREATION',
  description: 'Create an Eckam Creation customer account.',
};

type AccountSignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountSignupPage({ searchParams }: AccountSignupPageProps) {
  const next = safeReturnTo((await searchParams).next);
  return <AccountSignupForm next={next} />;
}
