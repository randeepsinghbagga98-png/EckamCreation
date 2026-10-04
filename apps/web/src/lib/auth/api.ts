import type { SessionDto } from '@eckamcreation/api-contracts';
import { paths } from '@eckamcreation/api-contracts';
import { apiRequest } from '@/lib/api/client';
import type { AuthSessionResponse, LoginInput, RegisterInput } from './types';

export function getAuthSession() {
  return apiRequest<AuthSessionResponse>(paths.auth.session);
}

export function loginCustomer(input: LoginInput) {
  return apiRequest<SessionDto>(paths.auth.login, {
    method: 'POST',
    body: input,
  });
}

export function registerCustomer(input: RegisterInput) {
  return apiRequest<SessionDto>(paths.auth.register, {
    method: 'POST',
    body: input,
  });
}

export function logoutCustomer() {
  return apiRequest<{ loggedOut: boolean }>(paths.auth.logout, {
    method: 'POST',
  });
}
