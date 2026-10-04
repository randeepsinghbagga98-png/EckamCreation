import type { AddressDto, MoneyDto, ProfileDto } from '@eckamcreation/api-contracts';
import { formatProductPrice } from '@/lib/catalogue/product';
import type { AddressFormValues, ProfileFormValues } from './types';

export function formatAccountMoney(money: MoneyDto): string {
  return formatProductPrice({
    amountMinor: money.amountMinor,
    currencyCode: money.currencyCode,
  });
}

export function formatAccountDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function displayName(profile: Pick<ProfileDto, 'name' | 'email'> | null): string {
  if (profile?.name?.trim()) {
    return profile.name.trim();
  }
  if (profile?.email?.trim()) {
    return profile.email.trim();
  }
  return 'your account';
}

export function emptyProfileForm(): ProfileFormValues {
  return {
    name: '',
    phone: '',
  };
}

export function profileToForm(profile: ProfileDto): ProfileFormValues {
  return {
    name: profile.name ?? '',
    phone: profile.phone ?? '',
  };
}

export function emptyAddressForm(): AddressFormValues {
  return {
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  };
}

export function addressToForm(address: AddressDto): AddressFormValues {
  return {
    fullName: address.fullName,
    phone: address.phone ?? '',
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state ?? '',
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

export function knownCountryId(
  profile: ProfileDto | null,
  addresses: AddressDto[],
): string | null {
  const fromAddress = addresses.find((address) => address.countryId.trim())?.countryId;
  if (fromAddress) {
    return fromAddress;
  }
  return profile?.defaultCountryId?.trim() || null;
}

export function formatOrderStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
