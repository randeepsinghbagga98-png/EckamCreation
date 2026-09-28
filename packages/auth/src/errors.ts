export class AuthError extends Error {
  readonly code:
    | "INVALID_CREDENTIALS"
    | "EMAIL_TAKEN"
    | "ACCOUNT_DISABLED"
    | "WEAK_PASSWORD"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND";

  constructor(
    code: AuthError["code"],
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AuthError";
    this.code = code;
  }
}
