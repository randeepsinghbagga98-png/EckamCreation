import type { AiProviderKind, AiProviderTurnInput, AiProviderTurnResult } from "./types";

export interface AiProvider {
  readonly id: string;
  readonly kind: AiProviderKind;
  isConfigured(): boolean;
  completeTurn(input: AiProviderTurnInput): Promise<AiProviderTurnResult>;
}
