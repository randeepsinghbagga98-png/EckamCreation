import { describe, expect, it } from "vitest";
import {
  AI_MAX_TOOL_ITERATIONS,
  AiToolInvalidArgumentsError,
  AiToolLoopLimitError,
  AiToolNotFoundError,
  AiToolRegistry,
  DevelopmentAiProvider,
  createEckamAiService,
  type AiProvider,
  type AiProviderTurnResult,
  type AiTool,
} from "./index";
import { AiProviderRegistry } from "./registry";

function echoTool(): AiTool {
  return {
    name: "test.echo",
    description: "Echo a query for tests.",
    async execute(args) {
      if (typeof args.query !== "string" || !args.query.trim()) {
        throw new AiToolInvalidArgumentsError();
      }
      return { ok: true, data: { query: args.query } };
    },
  };
}

describe("AI tool registry", () => {
  it("registers and executes only known tools", async () => {
    const tools = new AiToolRegistry();
    tools.register(echoTool());
    expect(tools.list().map((tool) => tool.name)).toEqual(["test.echo"]);

    const result = await tools.execute("test.echo", { query: "bag" }, { conversationId: "c1" });
    expect(result).toEqual({ ok: true, data: { query: "bag" } });
  });

  it("rejects unknown tools and arbitrary function names", async () => {
    const tools = new AiToolRegistry();
    tools.register(echoTool());

    await expect(tools.execute("eval", { code: "1+1" }, { conversationId: "c1" })).rejects.toBeInstanceOf(
      AiToolNotFoundError,
    );
    await expect(
      tools.execute("fs.read", { path: "/etc/passwd" }, { conversationId: "c1" }),
    ).rejects.toBeInstanceOf(AiToolNotFoundError);
    await expect(
      tools.execute("catalogue.drop_database", {}, { conversationId: "c1" }),
    ).rejects.toBeInstanceOf(AiToolNotFoundError);
  });

  it("rejects invalid and dangerous arguments", async () => {
    const tools = new AiToolRegistry();
    tools.register(echoTool());

    await expect(tools.execute("test.echo", { query: "   " }, { conversationId: "c1" })).rejects.toBeInstanceOf(
      AiToolInvalidArgumentsError,
    );
    await expect(
      tools.execute("test.echo", { sql: "SELECT * FROM Product" }, { conversationId: "c1" }),
    ).rejects.toBeInstanceOf(AiToolInvalidArgumentsError);
    await expect(
      tools.execute("test.echo", { path: "C:\\\\secrets" }, { conversationId: "c1" }),
    ).rejects.toBeInstanceOf(AiToolInvalidArgumentsError);
    await expect(
      tools.execute("test.echo", { query: "bag", userId: "someone-else" }, { conversationId: "c1" }),
    ).rejects.toBeInstanceOf(AiToolInvalidArgumentsError);
    await expect(
      tools.execute("test.echo", { query: "bag", customerId: "cust_1" }, { conversationId: "c1" }),
    ).rejects.toBeInstanceOf(AiToolInvalidArgumentsError);
    await expect(
      tools.execute("test.echo", { query: "bag", accountId: "acc_1" }, { conversationId: "c1" }),
    ).rejects.toBeInstanceOf(AiToolInvalidArgumentsError);
  });
});

describe("AI tool loop", () => {
  it("stops after the maximum number of tool iterations", async () => {
    const loopingProvider: AiProvider = {
      id: "loop",
      kind: "development",
      isConfigured: () => true,
      async completeTurn(): Promise<AiProviderTurnResult> {
        return {
          text: "",
          provider: "loop",
          toolCalls: [{ toolName: "test.echo", arguments: { query: "bag" } }],
        };
      },
    };

    const providers = new AiProviderRegistry();
    providers.register(loopingProvider);
    const tools = new AiToolRegistry();
    tools.register(echoTool());
    const service = createEckamAiService(providers, null, tools);

    await expect(
      service.completeTurn({
        conversationId: "conv_loop",
        messages: [{ role: "user", content: "Keep searching" }],
      }),
    ).rejects.toBeInstanceOf(AiToolLoopLimitError);

    expect(AI_MAX_TOOL_ITERATIONS).toBe(3);
  });

  it("executes a queued development tool call then returns a text reply", async () => {
    const provider = new DevelopmentAiProvider();
    provider.queueToolCalls([{ toolName: "test.echo", arguments: { query: "bag" } }]);
    const providers = new AiProviderRegistry();
    providers.register(provider);
    const tools = new AiToolRegistry();
    tools.register(echoTool());
    const service = createEckamAiService(providers, null, tools);

    const result = await service.completeTurn({
      conversationId: "conv_tool",
      messages: [{ role: "user", content: "Search bags" }],
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.status).toBe("success");
    expect(result.toolCalls[0]?.result).toEqual({ query: "bag" });
    expect(result.assistantMessage).toBe("Eckam AI development provider is connected.");
  });

  it("does not replay a duplicated commerce tool call in the same turn", async () => {
    let executions = 0;
    const cartTool: AiTool = {
      name: "commerce.add_to_cart",
      description: "Add to cart",
      async execute() {
        executions += 1;
        return { ok: true, data: { success: true, quantity: 1 } };
      },
    };
    const provider = new DevelopmentAiProvider();
    provider.queueToolCalls([
      { toolName: "commerce.add_to_cart", arguments: { variantId: "var_1", quantity: 1 } },
      { toolName: "commerce.add_to_cart", arguments: { variantId: "var_1", quantity: 1 } },
    ]);
    const providers = new AiProviderRegistry();
    providers.register(provider);
    const tools = new AiToolRegistry();
    tools.register(cartTool);
    const service = createEckamAiService(providers, null, tools);

    const result = await service.completeTurn({
      conversationId: "conv_dup",
      userId: "user_1",
      messages: [{ role: "user", content: "Add the tote" }],
    });

    expect(executions).toBe(1);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls.every((call) => call.status === "success")).toBe(true);
  });

  it("does not replay a duplicated cancel_order tool call in the same turn", async () => {
    let executions = 0;
    const cancelTool: AiTool = {
      name: "customer.cancel_order",
      description: "Cancel an order",
      async execute() {
        executions += 1;
        return { ok: true, data: { success: true, kind: "order_cancel", orderNumber: "ECK-1" } };
      },
    };
    const provider = new DevelopmentAiProvider();
    provider.queueToolCalls([
      { toolName: "customer.cancel_order", arguments: { orderNumber: "ECK-1" } },
      { toolName: "customer.cancel_order", arguments: { orderNumber: "ECK-1" } },
    ]);
    const providers = new AiProviderRegistry();
    providers.register(provider);
    const tools = new AiToolRegistry();
    tools.register(cancelTool);
    const service = createEckamAiService(providers, null, tools);

    const result = await service.completeTurn({
      conversationId: "conv_cancel_dup",
      userId: "user_1",
      messages: [{ role: "user", content: "Cancel order ECK-1" }],
    });

    expect(executions).toBe(1);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls.every((call) => call.status === "success")).toBe(true);
  });
});
