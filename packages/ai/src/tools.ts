import {
  AiToolInvalidArgumentsError,
  AiToolNotFoundError,
  toSanitizedAiToolError,
} from "./errors";

export const AI_TOOL_NAME_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;

export const AI_TOOL_ARGS_MAX_BYTES = 4000;

const FORBIDDEN_ARGUMENT_KEYS = new Set([
  "sql",
  "prisma",
  "queryraw",
  "path",
  "filepath",
  "filename",
  "command",
  "shell",
  "eval",
  "function",
  "fn",
  "script",
  "javascript",
  "href",
  "url",
  "fetch",
  "code",
  "userid",
  "customerid",
  "accountid",
]);

export type AiToolContext = {
  conversationId: string;
  userId?: string;
};

export type AiToolResult = {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
};

export interface AiTool {
  readonly name: string;
  readonly description: string;
  execute(args: Record<string, unknown>, context: AiToolContext): Promise<AiToolResult>;
}

export class AiToolRegistry {
  private readonly tools = new Map<string, AiTool>();

  register(tool: AiTool): void {
    if (!AI_TOOL_NAME_PATTERN.test(tool.name)) {
      throw new AiToolNotFoundError("AI tool name is invalid");
    }
    this.tools.set(tool.name, tool);
  }

  list(): AiTool[] {
    return [...this.tools.values()];
  }

  definitions(): Array<{ name: string; description: string }> {
    return this.list().map((tool) => ({ name: tool.name, description: tool.description }));
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  async execute(
    name: string,
    args: Record<string, unknown> | undefined,
    context: AiToolContext,
  ): Promise<AiToolResult> {
    if (!AI_TOOL_NAME_PATTERN.test(name) || !this.tools.has(name)) {
      throw new AiToolNotFoundError();
    }

    const normalized = normalizeToolArgs(args);
    const tool = this.tools.get(name)!;

    try {
      return await tool.execute(normalized, context);
    } catch (error) {
      throw toSanitizedAiToolError(error);
    }
  }
}

export function normalizeToolArgs(args: unknown): Record<string, unknown> {
  if (args == null) {
    return {};
  }
  if (typeof args !== "object" || Array.isArray(args)) {
    throw new AiToolInvalidArgumentsError();
  }

  const serialized = JSON.stringify(args);
  if (serialized.length > AI_TOOL_ARGS_MAX_BYTES) {
    throw new AiToolInvalidArgumentsError();
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    const lower = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (FORBIDDEN_ARGUMENT_KEYS.has(lower)) {
      throw new AiToolInvalidArgumentsError();
    }
    out[key] = value;
  }
  return out;
}
