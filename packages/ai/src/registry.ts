import { AiProviderNotConfiguredError } from "./errors";
import type { AiProvider } from "./provider";

export class AiProviderRegistry {
  private readonly adapters = new Map<string, AiProvider>();

  register(adapter: AiProvider): void {
    this.adapters.set(adapter.id, adapter);
  }

  list(): AiProvider[] {
    return [...this.adapters.values()];
  }

  get(id: string): AiProvider | undefined {
    return this.adapters.get(id);
  }

  resolve(preferredId?: string | null): AiProvider {
    if (preferredId) {
      const preferred = this.adapters.get(preferredId);
      if (!preferred || !preferred.isConfigured()) {
        throw new AiProviderNotConfiguredError(
          preferredId
            ? `AI provider "${preferredId}" is not configured`
            : "No AI provider is configured",
        );
      }
      return preferred;
    }

    const configured = this.list().filter((adapter) => adapter.isConfigured());
    if (configured.length === 0) {
      throw new AiProviderNotConfiguredError();
    }
    return configured[0]!;
  }
}
