import { describe, expect, it } from "vitest";
import { AI_TOOL_PERMISSIONS, isMutationAiTool } from "./tool-permissions";

describe("AI tool permissions", () => {
  it("classifies catalogue and customer lookups as read-only", () => {
    expect(AI_TOOL_PERMISSIONS["catalogue.search_products"]).toBe("READ_ONLY");
    expect(AI_TOOL_PERMISSIONS["customer.get_order"]).toBe("READ_ONLY");
    expect(isMutationAiTool("customer.get_recent_orders")).toBe(false);
  });

  it("classifies cart, wishlist, and cancel as mutations", () => {
    expect(isMutationAiTool("commerce.add_to_cart")).toBe(true);
    expect(isMutationAiTool("commerce.add_to_wishlist")).toBe(true);
    expect(isMutationAiTool("customer.cancel_order")).toBe(true);
    expect(AI_TOOL_PERMISSIONS["customer.request_refund"]).toBeUndefined();
  });
});
