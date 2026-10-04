/**
 * In-memory guest cart identity.
 * The backend returns guestToken on CartDto and X-Cart-Token.
 * Do not persist this token in localStorage, sessionStorage, or JS cookies.
 */
let guestToken: string | null = null;

export function rememberGuestToken(token: string | null | undefined) {
  if (typeof token === 'string' && token.trim()) {
    guestToken = token.trim();
  }
}

export function getGuestToken(): string | null {
  return guestToken;
}

export function hasGuestToken(): boolean {
  return Boolean(guestToken);
}
