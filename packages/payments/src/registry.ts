import type { PaymentProviderAdapter } from "./types";
import { PaymentProviderNotConfiguredError, PaymentValidationError } from "./errors";

export class PaymentProviderRegistry {
  private readonly adapters = new Map<string, PaymentProviderAdapter>();

  register(adapter: PaymentProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  list(): PaymentProviderAdapter[] {
    return [...this.adapters.values()];
  }

  get(id: string): PaymentProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  /** Prefer configured adapters; optional preferred id. */
  resolve(preferredId?: string | null): PaymentProviderAdapter {
    if (preferredId) {
      const preferred = this.adapters.get(preferredId);
      if (!preferred) {
        throw new PaymentValidationError(`Unknown payment provider: ${preferredId}`);
      }
      if (!preferred.isConfigured()) {
        throw new PaymentProviderNotConfiguredError(preferredId);
      }
      return preferred;
    }

    const configured = this.list().filter((a) => a.isConfigured());
    if (configured.length === 0) {
      throw new PaymentProviderNotConfiguredError();
    }
    return configured[0]!;
  }
}
