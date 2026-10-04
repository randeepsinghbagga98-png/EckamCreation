export const AI_TOOL_PERMISSION_READ_ONLY = "READ_ONLY" as const;
export const AI_TOOL_PERMISSION_MUTATION = "MUTATION" as const;

export type AiToolPermission = typeof AI_TOOL_PERMISSION_READ_ONLY | typeof AI_TOOL_PERMISSION_MUTATION;

export const AI_TOOL_PERMISSIONS: Record<string, AiToolPermission> = {
  "catalogue.search_products": AI_TOOL_PERMISSION_READ_ONLY,
  "catalogue.get_product": AI_TOOL_PERMISSION_READ_ONLY,
  "catalogue.get_categories": AI_TOOL_PERMISSION_READ_ONLY,
  "catalogue.get_products_by_category": AI_TOOL_PERMISSION_READ_ONLY,
  "catalogue.compare_products": AI_TOOL_PERMISSION_READ_ONLY,
  "customer.get_profile": AI_TOOL_PERMISSION_READ_ONLY,
  "customer.get_recent_orders": AI_TOOL_PERMISSION_READ_ONLY,
  "customer.get_order": AI_TOOL_PERMISSION_READ_ONLY,
  "customer.get_order_status": AI_TOOL_PERMISSION_READ_ONLY,
  "customer.get_order_tracking": AI_TOOL_PERMISSION_READ_ONLY,
  "commerce.add_to_cart": AI_TOOL_PERMISSION_MUTATION,
  "commerce.remove_from_cart": AI_TOOL_PERMISSION_MUTATION,
  "commerce.update_cart_quantity": AI_TOOL_PERMISSION_MUTATION,
  "commerce.add_to_wishlist": AI_TOOL_PERMISSION_MUTATION,
  "commerce.remove_from_wishlist": AI_TOOL_PERMISSION_MUTATION,
  "customer.cancel_order": AI_TOOL_PERMISSION_MUTATION,
};

export function isMutationAiTool(name: string): boolean {
  return AI_TOOL_PERMISSIONS[name] === AI_TOOL_PERMISSION_MUTATION;
}
