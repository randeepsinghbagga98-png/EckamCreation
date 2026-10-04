import type { AddressFormValues, ProfileFormValues } from './types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: { email: string; password: string }) {
  const errors: Partial<Record<'email' | 'password', string>> = {};

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  }

  return errors;
}

export function validateSignup(values: { name: string; email: string; password: string }) {
  const errors: Partial<Record<'name' | 'email' | 'password', string>> = {};

  if (values.name.trim() && values.name.trim().length > 120) {
    errors.name = 'Name must be 120 characters or fewer.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (values.password.length > 128) {
    errors.password = 'Password must be 128 characters or fewer.';
  }

  return errors;
}

export function validateProfile(values: ProfileFormValues) {
  const errors: Partial<ProfileFormValues> = {};

  if (values.name.trim() && values.name.trim().length > 120) {
    errors.name = 'Name must be 120 characters or fewer.';
  }

  if (values.phone.trim()) {
    if (values.phone.trim().length < 3 || values.phone.trim().length > 32) {
      errors.phone = 'Enter a valid phone number.';
    }
  }

  return errors;
}

export function validateAddress(values: AddressFormValues) {
  const errors: Partial<Record<keyof AddressFormValues, string>> = {};

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }
  if (!values.line1.trim()) {
    errors.line1 = 'Address line 1 is required.';
  }
  if (!values.city.trim()) {
    errors.city = 'City is required.';
  }
  if (!values.postalCode.trim()) {
    errors.postalCode = 'Postal code is required.';
  }

  return errors;
}
