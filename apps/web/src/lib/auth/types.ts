import type { SessionDto } from '@eckamcreation/api-contracts';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'error';

export type AuthSnapshot = {
  status: AuthStatus;
  session: SessionDto | null;
  notice: string | null;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  session: SessionDto | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
};
