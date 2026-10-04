import type {
  AddressDto,
  OrderDto,
  OrderSummaryDto,
  ProfileDto,
} from '@eckamcreation/api-contracts';
import { paths } from '@eckamcreation/api-contracts';
import { apiRequest } from '@/lib/api/client';
import { getCustomerWishlist } from '@/lib/wishlist/api';
import type { AddressFormValues, ProfileFormValues } from './types';

export { getCustomerWishlist };

export function getCustomerProfile() {
  return apiRequest<ProfileDto>(paths.me.root);
}

export function updateCustomerProfile(values: ProfileFormValues) {
  const body: {
    name: string | null;
    phone: string | null;
  } = {
    name: values.name.trim() || null,
    phone: values.phone.trim() || null,
  };

  return apiRequest<ProfileDto>(paths.me.root, {
    method: 'PATCH',
    body,
  });
}

export function listCustomerAddresses() {
  return apiRequest<{ items: AddressDto[] }>(paths.me.addresses);
}

export function createCustomerAddress(
  values: AddressFormValues,
  countryId: string,
) {
  return apiRequest<AddressDto>(paths.me.addresses, {
    method: 'POST',
    body: toAddressBody(values, countryId),
  });
}

export function updateCustomerAddress(
  id: string,
  values: AddressFormValues,
  countryId?: string,
) {
  return apiRequest<AddressDto>(paths.me.address(id), {
    method: 'PATCH',
    body: {
      ...toAddressBody(values, countryId),
    },
  });
}

export function deleteCustomerAddress(id: string) {
  return apiRequest<{ deleted: true }>(paths.me.address(id), {
    method: 'DELETE',
  });
}

export function listCustomerOrders() {
  return apiRequest<{ items: OrderSummaryDto[] }>(paths.me.orders);
}

export function getCustomerOrder(idOrNumber: string) {
  return apiRequest<OrderDto>(paths.me.order(idOrNumber));
}

function toAddressBody(values: AddressFormValues, countryId?: string) {
  return {
    type: 'SHIPPING' as const,
    fullName: values.fullName.trim(),
    phone: values.phone.trim() || undefined,
    line1: values.line1.trim(),
    line2: values.line2.trim() || undefined,
    city: values.city.trim(),
    state: values.state.trim() || undefined,
    postalCode: values.postalCode.trim(),
    ...(countryId ? { countryId } : {}),
    isDefault: values.isDefault,
  };
}
