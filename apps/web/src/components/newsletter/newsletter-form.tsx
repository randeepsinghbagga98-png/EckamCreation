'use client';

import { useId, useState, type FormEvent } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNAVAILABLE_MESSAGE = 'Newsletter signup will be available soon.';

type FormStatus =
  | { type: 'idle' }
  | { type: 'error'; message: string }
  | { type: 'notice'; message: string };

type NewsletterFormProps = {
  /** Optional hook for a future subscription API. Not called until a backend exists. */
  onSubscribe?: (email: string) => void | Promise<void>;
};

export function NewsletterForm({ onSubscribe }: NewsletterFormProps) {
  const inputId = useId();
  const messageId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>({ type: 'idle' });

  function validate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return 'Enter your email address.';
    if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.';
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const error = validate(email);
    if (error) {
      setStatus({ type: 'error', message: error });
      return;
    }

    if (onSubscribe) {
      void onSubscribe(email.trim());
      return;
    }

    setStatus({ type: 'notice', message: UNAVAILABLE_MESSAGE });
  }

  const invalid = status.type === 'error';

  return (
    <form
      className="newsletter-form"
      noValidate
      onSubmit={handleSubmit}
      aria-describedby={status.type === 'idle' ? undefined : messageId}
    >
      <label
        htmlFor={inputId}
        className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8B6914]"
      >
        Email address
      </label>

      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status.type !== 'idle') setStatus({ type: 'idle' });
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={status.type === 'idle' ? undefined : messageId}
          placeholder="name@email.com"
          className="newsletter-input min-h-12 w-full flex-1 rounded-[4px] bg-white px-4 text-[15px] text-[#1A1815] placeholder:text-[#1A1815]/40"
        />
        <button
          type="submit"
          className="newsletter-submit inline-flex min-h-12 shrink-0 items-center justify-center px-7 text-[11px] font-bold tracking-[0.2em] uppercase text-[#050505]"
        >
          Join the list
        </button>
      </div>

      <p
        id={messageId}
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm font-light ${
          invalid ? 'text-[#8B2014]' : 'text-[#1A1815]/70'
        }`}
      >
        {status.type === 'idle' ? '' : status.message}
      </p>
    </form>
  );
}
