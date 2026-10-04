'use client';

import { useId, useState, type FormEvent } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MIN = 20;

type ContactValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const EMPTY: ContactValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

function validate(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (!name) errors.name = 'Enter your full name.';
  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  if (!subject) errors.subject = 'Enter a subject.';
  if (!message) errors.message = 'Enter your message.';
  else if (message.length < MESSAGE_MIN) {
    errors.message = `Enter at least ${MESSAGE_MIN} characters.`;
  }

  return errors;
}

export function ContactForm() {
  const formId = useId();
  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function update(field: keyof ContactValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="contact-success"
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914]">
          Thank you
        </p>
        <h2 className="mt-4 font-sans text-[clamp(28px,4vw,40px)] font-light leading-tight tracking-[-0.03em] uppercase text-[#1A1815]">
          Enquiry noted.
        </h2>
        <p className="mt-4 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/72">
          Your enquiry form is ready, but direct message delivery is coming
          soon.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" noValidate onSubmit={handleSubmit}>
      <ContactField
        id={`${formId}-name`}
        name="name"
        label="Full name"
        autoComplete="name"
        value={values.name}
        error={errors.name}
        onChange={(value) => update('name', value)}
      />
      <ContactField
        id={`${formId}-email`}
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={values.email}
        error={errors.email}
        onChange={(value) => update('email', value)}
      />
      <ContactField
        id={`${formId}-subject`}
        name="subject"
        label="Subject"
        autoComplete="off"
        value={values.subject}
        error={errors.subject}
        onChange={(value) => update('subject', value)}
      />
      <ContactField
        id={`${formId}-message`}
        name="message"
        label="Message"
        multiline
        value={values.message}
        error={errors.message}
        onChange={(value) => update('message', value)}
      />
      <button
        type="submit"
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center bg-[#1A1815] px-8 py-4 text-[11px] font-bold tracking-[0.22em] uppercase text-[#F6F0E5] transition-colors hover:bg-[#050505] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-2 sm:w-auto sm:text-xs"
      >
        Send enquiry
      </button>
    </form>
  );
}

type ContactFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  type?: 'text' | 'email';
  autoComplete?: string;
  inputMode?: 'email' | 'text';
  multiline?: boolean;
  onChange: (value: string) => void;
};

function ContactField({
  id,
  name,
  label,
  value,
  error,
  type = 'text',
  autoComplete,
  inputMode,
  multiline,
  onChange,
}: ContactFieldProps) {
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <div className="contact-field">
      <label htmlFor={id} className="contact-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={6}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="contact-input contact-textarea"
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="contact-input"
        />
      )}
      {error ? (
        <p id={errorId} className="contact-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
