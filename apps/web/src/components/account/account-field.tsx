import type { ChangeEventHandler, HTMLInputTypeAttribute } from 'react';

type AccountFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  type?: Extract<HTMLInputTypeAttribute, 'text' | 'email' | 'tel' | 'password'>;
  autoComplete?: string;
  inputMode?: 'email' | 'tel' | 'text' | 'numeric';
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function AccountField({
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
  disabled,
  onChange,
}: AccountFieldProps) {
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
        disabled={disabled}
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
