'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { getCustomerProfile, updateCustomerProfile } from '@/lib/account/api';
import { emptyProfileForm, profileToForm } from '@/lib/account/presentation';
import type { CustomerProfile, ProfileFormValues } from '@/lib/account/types';
import { validateProfile } from '@/lib/account/validation';
import { fieldErrorsFromApi, messageForAuthError } from '@/lib/auth/errors';
import { AccountField } from './account-field';

export function AccountProfile() {
  const formId = useId();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [values, setValues] = useState<ProfileFormValues>(emptyProfileForm);
  const [errors, setErrors] = useState<Partial<ProfileFormValues>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getCustomerProfile()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setProfile(data);
        setValues(profileToForm(data));
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setNotice(messageForAuthError(error));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="account-panel" aria-busy="true">
        <div className="account-skeleton account-skeleton--card" />
      </div>
    );
  }

  if (status === 'error' || !profile) {
    return (
      <div className="account-panel" role="alert">
        <p className="account-kicker">Profile</p>
        <p className="account-copy">{notice}</p>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    setNotice(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPending(true);
    try {
      const next = await updateCustomerProfile(values);
      setProfile(next);
      setValues(profileToForm(next));
      setNotice('Profile saved.');
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setNotice(messageForAuthError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="account-panel">
      <h2 className="account-section-title">Profile</h2>
      <dl className="account-meta">
        {profile.email ? (
          <div>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </div>
        ) : null}
        <div>
          <dt>Email status</dt>
          <dd>{profile.emailVerified ? 'Verified' : 'Not verified'}</dd>
        </div>
        {profile.locale ? (
          <div>
            <dt>Locale</dt>
            <dd>{profile.locale}</dd>
          </div>
        ) : null}
        {profile.defaultCurrencyCode ? (
          <div>
            <dt>Currency</dt>
            <dd>{profile.defaultCurrencyCode}</dd>
          </div>
        ) : null}
      </dl>
      <form className="account-form" onSubmit={onSubmit} noValidate>
        <AccountField
          id={`${formId}-name`}
          name="name"
          label="Name"
          autoComplete="name"
          optional
          value={values.name}
          error={errors.name}
          disabled={pending}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
        />
        <AccountField
          id={`${formId}-phone`}
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          optional
          value={values.phone}
          error={errors.phone}
          disabled={pending}
          onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
        />
        {notice ? (
          <p className={notice === 'Profile saved.' ? 'account-hint' : 'checkout-field-error'} role="status">
            {notice}
          </p>
        ) : null}
        <button type="submit" className="cart-cta cart-cta--primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </section>
  );
}
