import { redirect } from 'next/navigation';
import { safeReturnTo } from '@/lib/auth/return-to';

type SignupAliasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupAliasPage({ searchParams }: SignupAliasPageProps) {
  const next = safeReturnTo((await searchParams).next);
  redirect(next ? `/account/signup?next=${encodeURIComponent(next)}` : '/account/signup');
}
