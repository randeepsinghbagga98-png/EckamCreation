/** Provider-neutral email verification port — no external provider in Phase 3.2. */
export interface EmailVerificationPort {
  /** Queue or send a verification message. Implementations may no-op. */
  requestVerification(input: { userId: string; email: string }): Promise<void>;
  /** Confirm a token if the provider supports it. */
  confirmVerification?(input: { token: string }): Promise<{ userId: string } | null>;
}

export class NoopEmailVerification implements EmailVerificationPort {
  async requestVerification(): Promise<void> {
    // Intentional no-op until email provider phase.
  }
}
