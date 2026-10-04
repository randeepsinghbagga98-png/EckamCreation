import { redirect } from 'next/navigation';
import { safeReturnTo } from '@/lib/auth/return-to';

type LoginAliasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginAliasPage({ searchParams }: LoginAliasPageProps) {
  const next = safeReturnTo((await searchParams).next);
  redirect(next ? `/account/login?next=${encodeURIComponent(next)}` : '/account/login');
}
