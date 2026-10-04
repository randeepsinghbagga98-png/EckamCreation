import { AiError, AiToolLoopLimitError, toSanitizedAiProviderError } from "./errors";
import type { AiProviderRegistry } from "./registry";
import { ECKAM_AI_SYSTEM_INSTRUCTION } from "./system-prompt";
import { isMutationAiTool } from "./tool-permissions";
import type { AiToolRegistry } from "./tools";
import type { AiChatMessage, AiToolCallResult, AiTurnRequest, AiTurnResult } from "./types";

export const AI_MAX_TOOL_ITERATIONS = 3;
export const AI_TOOL_RESULT_MAX_CHARS = 8000;

export interface EckamAiService {
  readonly name: "eckam-ai";
  isConfigured(): boolean;
  completeTurn(input: AiTurnRequest): Promise<AiTurnResult>;
}

export type CreateEckamAiServiceOptions = {
  preferredProviderId?: string | null;
  tools?: AiToolRegistry;
  maxToolIterations?: number;
};

export class DefaultEckamAiService implements EckamAiService {
  readonly name = "eckam-ai" as const;

  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly preferredProviderId?: string | null,
    private readonly tools?: AiToolRegistry,
    private readonly maxToolIterations = AI_MAX_TOOL_ITERATIONS,
  ) {}

  isConfigured(): boolean {
    return this.registry.list().some((adapter) => adapter.isConfigured());
  }

  async completeTurn(input: AiTurnRequest): Promise<AiTurnResult> {
    const provider = this.registry.resolve(this.preferredProviderId);
    const messages: AiChatMessage[] = [...input.messages];
    const executed: AiToolCallResult[] = [];
    const commerceReplay = new Map<string, Awaited<ReturnType<DefaultEckamAiService["runTool"]>>>();
    let lastUsage = undefined as AiTurnResult["usage"];
    let lastProvider = provider.id;
    let lastModel: string | undefined;

    try {
      for (let iteration = 0; iteration <= this.maxToolIterations; iteration += 1) {
        if (iteration === this.maxToolIterations) {
          throw new AiToolLoopLimitError();
        }

        const result = await provider.completeTurn({
          conversationId: input.conversationId,
          messages,
          systemInstruction: ECKAM_AI_SYSTEM_INSTRUCTION,
          tools: this.tools?.definitions(),
        });

        lastUsage = result.usage;
        lastProvider = result.provider;
        lastModel = result.model;

        const toolCalls = result.toolCalls ?? [];
        if (toolCalls.length === 0) {
          return {
            assistantMessage: result.text,
            toolCalls: executed,
            usage: lastUsage,
            provider: lastProvider,
            model: lastModel,
          };
        }

        messages.push({
          role: "assistant",
          content: result.text || "",
          toolCalls,
        });

        for (const call of toolCalls) {
          const started = Date.now();
          const replayKey = mutatingToolReplayKey(call.toolName, call.arguments);
          const replayed = replayKey ? commerceReplay.get(replayKey) : undefined;
          const outcome =
            replayed ??
            (await this.runTool(call.toolName, call.arguments, {
              conversationId: input.conversationId,
              userId: input.userId,
            }));
          if (replayKey && !replayed) {
            commerceReplay.set(replayKey, outcome);
          }
          executed.push({
            toolName: call.toolName,
            arguments: call.arguments,
            result: outcome.data,
            status: outcome.ok ? "success" : "error",
            durationMs: Date.now() - started,
            error: outcome.error?.message,
          });
          messages.push({
            role: "tool",
            content: boundToolResultPayload(call.toolName, outcome),
            toolCalls: [call],
          });
        }
      }

      throw new AiToolLoopLimitError();
    } catch (error) {
      if (error instanceof AiError) {
        throw error;
      }
      throw toSanitizedAiProviderError(error);
    }
  }

  private async runTool(
    name: string,
    args: Record<string, unknown> | undefined,
    context: { conversationId: string; userId?: string },
  ) {
    if (!this.tools) {
      return {
        ok: false,
        error: { code: "AI_TOOL_NOT_FOUND", message: "Requested AI tool is not available" },
      };
    }

    try {
      return await this.tools.execute(name, args, context);
    } catch (error) {
      if (error instanceof AiError) {
        return {
          ok: false,
          error: { code: error.code, message: error.message },
        };
      }
      return {
        ok: false,
        error: {
          code: "AI_TOOL_EXECUTION_FAILED",
          message: "The catalogue tool failed to complete this request",
        },
      };
    }
  }
}

function mutatingToolReplayKey(
  toolName: string,
  args: Record<string, unknown> | undefined,
): string | null {
  if (isMutationAiTool(toolName)) {
    return `${toolName}:${stableToolArgs(args)}`;
  }
  return null;
}

function boundToolResultPayload(
  toolName: string,
  outcome: { ok: boolean; data?: unknown; error?: { code: string; message: string } },
): string {
  const payload = outcome.ok
    ? { ok: true, toolName, data: outcome.data }
    : { ok: false, toolName, error: outcome.error };
  const serialized = JSON.stringify(payload);
  if (serialized.length <= AI_TOOL_RESULT_MAX_CHARS) {
    return serialized;
  }
  return JSON.stringify({
    ok: outcome.ok,
    toolName,
    truncated: true,
    error: outcome.ok ? undefined : outcome.error,
  });
}

function stableToolArgs(args: Record<string, unknown> | undefined): string {
  return JSON.stringify(args ?? {}, Object.keys(args ?? {}).sort());
}

export function createEckamAiService(
  registry: AiProviderRegistry,
  preferredProviderId?: string | null,
  tools?: AiToolRegistry,
): EckamAiService {
  return new DefaultEckamAiService(registry, preferredProviderId, tools);
}
