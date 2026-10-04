import type {
  AddressDto,
  OrderDto,
  OrderSummaryDto,
  ProfileDto,
  WishlistItemDto,
} from '@eckamcreation/api-contracts';

export type ProfileFormValues = {
  name: string;
  phone: string;
};

export type ProfileFieldKey = keyof ProfileFormValues;

export type AddressFormValues = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

export type AddressFieldKey = Exclude<keyof AddressFormValues, 'isDefault'>;

export type AccountListState<T> = {
  status: 'loading' | 'ready' | 'empty' | 'error';
  items: T[];
  notice: string | null;
};

export type AddressListItem = AddressDto;
export type OrderListItem = OrderSummaryDto;
export type OrderDetail = OrderDto;
export type WishlistListItem = WishlistItemDto;
export type CustomerProfile = ProfileDto;
