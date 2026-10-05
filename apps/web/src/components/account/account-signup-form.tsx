'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { fieldErrorsFromApi, messageForAuthError } from '@/lib/auth/errors';
import { signUp, useAuth } from '@/lib/auth/session';
import { safeReturnTo } from '@/lib/auth/return-to';
import { validateSignup } from '@/lib/account/validation';
import { AccountField } from './account-field';
import { AccountLoading } from './account-loading';

type AccountSignupFormProps = {
  next?: string;
};

export function AccountSignupForm({ next }: AccountSignupFormProps) {
  const router = useRouter();
  const auth = useAuth();
  const destination = safeReturnTo(next) ?? '/account';
  const formId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'password', string>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (auth.status === 'authenticated') {
      router.replace(destination);
    }
  }, [auth.status, destination, router]);

  if (auth.status === 'authenticated') {
    return <AccountLoading />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const nextErrors = validateSignup({ name, email, password });
    setErrors(nextErrors);
    setNotice(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      router.replace(destination);
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setNotice(messageForAuthError(error, 'signup'));
      setPending(false);
    }
  }

  return (
    <div className="account-page">
      <div className="account-shell account-shell--narrow">
        <p className="account-kicker">Welcome to Eckam</p>
        <h1 className="account-title">Create account.</h1>
        <p className="account-copy">
          Register with the details supported by your Eckam account.
        </p>
        <form id={formId} className="account-form" onSubmit={onSubmit} noValidate>
          <AccountField
            id={`${formId}-name`}
            name="name"
            label="Name"
            autoComplete="name"
            optional
            value={name}
            error={errors.name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
          />
          <AccountField
            id={`${formId}-email`}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            error={errors.email}
            disabled={pending}
            onChange={(event) => setEmail(event.target.value)}
          />
          <AccountField
            id={`${formId}-password`}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            error={errors.password}
            disabled={pending}
            onChange={(event) => setPassword(event.target.value)}
          />
          {notice ? (
            <p className="checkout-field-error" role="alert">
              {notice}
            </p>
          ) : null}
          <button type="submit" className="cart-cta cart-cta--primary" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="account-switch">
          Already have an account?{' '}
          <Link href={next ? `/account/login?next=${encodeURIComponent(next)}` : '/account/login'}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
