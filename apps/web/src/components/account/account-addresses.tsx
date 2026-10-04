'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerProfile,
  listCustomerAddresses,
  updateCustomerAddress,
} from '@/lib/account/api';
import {
  addressToForm,
  emptyAddressForm,
  knownCountryId,
} from '@/lib/account/presentation';
import type { AddressFormValues, AddressListItem, CustomerProfile } from '@/lib/account/types';
import { validateAddress } from '@/lib/account/validation';
import { fieldErrorsFromApi, messageForAuthError } from '@/lib/auth/errors';
import { AccountAddressForm } from './account-address-form';
import { AccountEmptyState } from './account-empty-state';

export function AccountAddresses() {
  const formId = useId();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [items, setItems] = useState<AddressListItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [values, setValues] = useState<AddressFormValues>(emptyAddressForm);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  const [pending, setPending] = useState(false);

  async function refresh() {
    const [nextProfile, addresses] = await Promise.all([
      getCustomerProfile(),
      listCustomerAddresses(),
    ]);
    setProfile(nextProfile);
    setItems(addresses.items);
    setStatus('ready');
    setNotice(null);
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.all([getCustomerProfile(), listCustomerAddresses()])
      .then(([nextProfile, addresses]) => {
        if (cancelled) {
          return;
        }
        setProfile(nextProfile);
        setItems(addresses.items);
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

  const countryId = knownCountryId(profile, items);
  const countryReady = Boolean(countryId);
  const countryNote = countryReady
    ? 'New and updated addresses will use the country already saved on your account. A public country directory is not available yet.'
    : 'Country selection is pending. The address API requires a real country identifier, and no public country directory is available.';

  if (status === 'loading') {
    return (
      <div className="account-panel" aria-busy="true">
        <div className="account-skeleton account-skeleton--card" />
        <div className="account-skeleton account-skeleton--card" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="account-panel" role="alert">
        <p className="account-kicker">Addresses</p>
        <p className="account-copy">{notice}</p>
        <button
          type="button"
          className="cart-cta cart-cta--primary mt-6"
          onClick={() => {
            setStatus('loading');
            void refresh().catch((error) => {
              setNotice(messageForAuthError(error));
              setStatus('error');
            });
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  function startCreate() {
    setEditingId('new');
    setValues(emptyAddressForm());
    setErrors({});
    setNotice(null);
  }

  function startEdit(address: AddressListItem) {
    setEditingId(address.id);
    setValues(addressToForm(address));
    setErrors({});
    setNotice(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const nextErrors = validateAddress(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (editingId === 'new' && !countryId) {
      setNotice(countryNote);
      return;
    }

    setPending(true);
    setNotice(null);
    try {
      if (editingId === 'new' && countryId) {
        await createCustomerAddress(values, countryId);
      } else if (editingId && editingId !== 'new') {
        const current = items.find((item) => item.id === editingId);
        await updateCustomerAddress(editingId, values, current?.countryId);
      }
      setEditingId(null);
      await refresh();
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setNotice(messageForAuthError(error));
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (pending) {
      return;
    }
    setPending(true);
    setNotice(null);
    try {
      await deleteCustomerAddress(id);
      if (editingId === id) {
        setEditingId(null);
      }
      await refresh();
    } catch (error) {
      setNotice(messageForAuthError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="account-panel">
      <div className="account-section-head">
        <h2 className="account-section-title">Addresses</h2>
        {editingId === null ? (
          <button type="button" className="cart-cta cart-cta--ghost" onClick={startCreate}>
            Add address
          </button>
        ) : null}
      </div>

      {notice ? (
        <p className="account-hint" role="status">
          {notice}
        </p>
      ) : null}

      {items.length === 0 && editingId !== 'new' ? (
        <AccountEmptyState
          kicker="Addresses"
          title="No saved addresses"
          copy="You have not saved an address yet."
        />
      ) : (
        <ul className="account-card-list">
          {items.map((address) => (
            <li key={address.id} className="account-card">
              <p className="account-card-title">{address.fullName}</p>
              <p className="account-card-copy">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                <br />
                {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
              </p>
              {address.phone ? <p className="account-card-copy">{address.phone}</p> : null}
              {address.isDefault ? <p className="account-chip">Default</p> : null}
              <div className="account-card-actions">
                <button type="button" className="account-text-button" onClick={() => startEdit(address)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="account-text-button"
                  disabled={pending}
                  onClick={() => {
                    void onDelete(address.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingId ? (
        <div className="account-form-block">
          <h3 className="account-section-title">
            {editingId === 'new' ? 'New address' : 'Edit address'}
          </h3>
          <AccountAddressForm
            id={formId}
            values={values}
            errors={errors}
            pending={pending}
            countryReady={editingId === 'new' ? countryReady : true}
            countryNote={countryNote}
            submitLabel={editingId === 'new' ? 'Save address' : 'Update address'}
            onChange={setValues}
            onSubmit={(event) => {
              void onSubmit(event);
            }}
            onCancel={() => {
              setEditingId(null);
              setErrors({});
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
