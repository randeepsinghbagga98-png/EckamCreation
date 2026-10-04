import type { ChangeEventHandler, ReactNode } from 'react';

type CheckoutFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  type?: 'text' | 'email' | 'tel';
  autoComplete?: string;
  inputMode?: 'email' | 'tel' | 'text' | 'numeric';
  required?: boolean;
  optional?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function CheckoutField({
  id,
  name,
  label,
  value,
  error,
  type = 'text',
  autoComplete,
  inputMode,
  required,
  optional,
  onChange,
}: CheckoutFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="checkout-field">
      <label htmlFor={id} className="checkout-label">
        {label}
        {optional ? <span className="checkout-optional">Optional</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="checkout-input"
      />
      {error ? (
        <p id={errorId} className="checkout-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type CheckoutSelectProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  children: ReactNode;
  onChange: ChangeEventHandler<HTMLSelectElement>;
};

export function CheckoutSelect({
  id,
  name,
  label,
  value,
  error,
  required,
  autoComplete,
  children,
  onChange,
}: CheckoutSelectProps) {
  const errorId = `${id}-error`;

  return (
    <div className="checkout-field">
      <label htmlFor={id} className="checkout-label">
        {label}
      </label>
      <select
        id={id}
        name={name}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="checkout-input checkout-select"
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="checkout-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
