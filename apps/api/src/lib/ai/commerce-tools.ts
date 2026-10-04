import {
  AiToolInvalidArgumentsError,
  type AiTool,
  type AiToolContext,
  type AiToolResult,
} from "@eckamcreation/ai";
import { CART_MAX_QUANTITY, type CartDto } from "@eckamcreation/api-contracts";
import { z } from "zod";
import { ApiError } from "../errors";
import type { CartIdentity, CartService } from "../cart/cart-service";
import type { CustomerService } from "../customer/customer-service";
import type { ProductService } from "../catalogue/product-service";

export const COMMERCE_ADD_TO_CART = "commerce.add_to_cart";
export const COMMERCE_REMOVE_FROM_CART = "commerce.remove_from_cart";
export const COMMERCE_UPDATE_CART_QUANTITY = "commerce.update_cart_quantity";
export const COMMERCE_ADD_TO_WISHLIST = "commerce.add_to_wishlist";
export const COMMERCE_REMOVE_FROM_WISHLIST = "commerce.remove_from_wishlist";

const addToCartSchema = z
  .object({
    variantId: z.string().trim().min(1).max(80).optional(),
    slug: z.string().trim().min(1).max(160).optional(),
    quantity: z.number().int().min(1).max(CART_MAX_QUANTITY).default(1),
  })
  .strict()
  .refine((value) => Boolean(value.variantId || value.slug), {
    message: "variantId or slug is required",
  });

const removeFromCartSchema = z
  .object({
    cartItemId: z.string().trim().min(1).max(80).optional(),
    variantId: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.cartItemId || value.variantId), {
    message: "cartItemId or variantId is required",
  });

const updateQuantitySchema = z
  .object({
    cartItemId: z.string().trim().min(1).max(80),
    quantity: z.number().int().min(1).max(CART_MAX_QUANTITY),
  })
  .strict();

const wishlistSchema = z
  .object({
    variantId: z.string().trim().min(1).max(80).optional(),
    slug: z.string().trim().min(1).max(160).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.variantId || value.slug), {
    message: "variantId or slug is required",
  });

type ToolFailure = {
  ok: false;
  error: { code: string; message: string };
  data?: unknown;
};

export type CommerceToolDeps = {
  cart: CartService;
  customers: CustomerService;
  products: ProductService;
};

export function createCommerceAiTools(deps: CommerceToolDeps): AiTool[] {
  return [
    createAddToCartTool(deps),
    createRemoveFromCartTool(deps),
    createUpdateQuantityTool(deps),
    createAddToWishlistTool(deps),
    createRemoveFromWishlistTool(deps),
  ];
}

function createAddToCartTool(deps: CommerceToolDeps): AiTool {
  return {
    name: COMMERCE_ADD_TO_CART,
    description:
      "Add a real product variant to the current customer's cart. Call only after an explicit add-to-cart request. Never invent variant IDs.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(addToCartSchema, args);
      const identity = requireCustomer(context);
      if (!identity.ok) {
        return identity;
      }
      const resolved = await resolveUniqueVariant(deps, input);
      if (!resolved.ok) {
        return resolved;
      }

      try {
        const quantity = input.quantity ?? 1;
        const cart = await deps.cart.addItem(identity.identity, {
          variantId: resolved.variantId,
          quantity,
        });
        const line = cart.items.find((item) => item.variantId === resolved.variantId);
        return {
          ok: true,
          data: {
            success: true,
            kind: "cart_add",
            product: productFromCartLine(line, resolved.product),
            quantity: line?.quantity ?? quantity,
            cart: toSafeCart(cart),
          },
        };
      } catch (error) {
        return mapCommerceError(error, "I couldn't add that item to your cart.");
      }
    },
  };
}

function createRemoveFromCartTool(deps: CommerceToolDeps): AiTool {
  return {
    name: COMMERCE_REMOVE_FROM_CART,
    description:
      "Remove one item from the current customer's cart. Call only after an explicit remove request.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(removeFromCartSchema, args);
      const identity = requireCustomer(context);
      if (!identity.ok) {
        return identity;
      }
      const cart = await readCart(deps.cart, identity.identity);
      if (!cart) {
        return fail("AI_CART_ITEM_NOT_FOUND", "That item is not in your cart.");
      }

      const line = cart.items.find(
        (item) => item.id === input.cartItemId || item.variantId === input.variantId,
      );
      if (!line) {
        return fail("AI_CART_ITEM_NOT_FOUND", "That item is not in your cart.");
      }

      try {
        const next = await deps.cart.removeItem(identity.identity, line.id);
        return {
          ok: true,
          data: {
            success: true,
            kind: "cart_remove",
            product: productFromCartLine(line),
            quantity: line.quantity,
            cart: toSafeCart(next),
          },
        };
      } catch (error) {
        return mapCommerceError(error, "I couldn't update your cart.");
      }
    },
  };
}

function createUpdateQuantityTool(deps: CommerceToolDeps): AiTool {
  return {
    name: COMMERCE_UPDATE_CART_QUANTITY,
    description:
      "Update quantity for one item in the current customer's cart. Call only after an explicit quantity change.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(updateQuantitySchema, args);
      const identity = requireCustomer(context);
      if (!identity.ok) {
        return identity;
      }
      const cart = await readCart(deps.cart, identity.identity);
      const line = cart?.items.find((item) => item.id === input.cartItemId);
      if (!line) {
        return fail("AI_CART_ITEM_NOT_FOUND", "That item is not in your cart.");
      }

      try {
        const next = await deps.cart.updateItem(identity.identity, line.id, input.quantity);
        const updated = next.items.find((item) => item.id === line.id);
        return {
          ok: true,
          data: {
            success: true,
            kind: "cart_update",
            product: productFromCartLine(updated ?? line),
            quantity: input.quantity,
            cart: toSafeCart(next),
          },
        };
      } catch (error) {
        return mapCommerceError(error, "I couldn't update your cart.");
      }
    },
  };
}

function createAddToWishlistTool(deps: CommerceToolDeps): AiTool {
  return {
    name: COMMERCE_ADD_TO_WISHLIST,
    description:
      "Save a real product variant to the current customer's wishlist. Call only after an explicit save/wishlist request.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(wishlistSchema, args);
      const userId = requireUserId(context);
      if (!userId.ok) {
        return userId;
      }
      const resolved = await resolveUniqueVariant(deps, input);
      if (!resolved.ok) {
        return resolved;
      }

      try {
        const item = await deps.customers.addWishlistItem(userId.userId, {
          variantId: resolved.variantId,
        });
        return {
          ok: true,
          data: {
            success: true,
            kind: "wishlist_add",
            product: {
              id: item.productId,
              slug: item.productSlug,
              name: item.productName,
              price: null,
              inStock: item.available,
              primaryMediaUrl: null,
              category: null,
            },
          },
        };
      } catch (error) {
        if (error instanceof ApiError && error.code === "CONFLICT") {
          return {
            ok: true,
            data: {
              success: true,
              kind: "wishlist_add",
              product: resolved.product,
              alreadySaved: true,
            },
          };
        }
        return mapCommerceError(error, "I couldn't save that item to your wishlist.");
      }
    },
  };
}

function createRemoveFromWishlistTool(deps: CommerceToolDeps): AiTool {
  return {
    name: COMMERCE_REMOVE_FROM_WISHLIST,
    description:
      "Remove a product from the current customer's wishlist. Call only after an explicit remove request.",
    async execute(args, context): Promise<AiToolResult> {
      const input = parseArgs(wishlistSchema, args);
      const userId = requireUserId(context);
      if (!userId.ok) {
        return userId;
      }
      const resolved = await resolveUniqueVariant(deps, input);
      if (!resolved.ok) {
        return resolved;
      }

      try {
        await deps.customers.removeWishlistItem(userId.userId, resolved.variantId);
        return {
          ok: true,
          data: {
            success: true,
            kind: "wishlist_remove",
            product: resolved.product,
          },
        };
      } catch (error) {
        return mapCommerceError(error, "I couldn't update your wishlist.");
      }
    },
  };
}

async function resolveUniqueVariant(
  deps: CommerceToolDeps,
  input: { variantId?: string; slug?: string },
): Promise<{ ok: true; variantId: string; product: Record<string, unknown> } | ToolFailure> {
  if (input.variantId) {
    return {
      ok: true,
      variantId: input.variantId,
      product: {},
    };
  }

  if (!input.slug) {
    return fail("AI_VARIANT_NOT_FOUND", "That product option is not available.");
  }

  try {
    const product = await deps.products.getPublicBySlugOrId(input.slug);
    const variants = product.variants.filter((variant) => variant.id);
    if (variants.length === 0) {
      return fail("AI_VARIANT_NOT_FOUND", "That product option is not available.");
    }
    if (variants.length > 1) {
      return {
        ok: false,
        error: {
          code: "AI_VARIANT_AMBIGUOUS",
          message: "This product has more than one option. Please choose a variant.",
        },
        data: {
          product: { id: product.id, slug: product.slug, name: product.name },
          variants: variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            inStock: variant.inStock,
          })),
        },
      };
    }

    const only = variants[0]!;
    return {
      ok: true,
      variantId: only.id,
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: only.price ?? product.price,
        inStock: only.inStock,
        primaryMediaUrl: product.media.find((item) => item.isPrimary)?.url ?? product.media[0]?.url ?? null,
        category: product.categories.find((item) => item.isPrimary)?.name ?? product.categories[0]?.name ?? null,
      },
    };
  } catch {
    return fail("AI_VARIANT_NOT_FOUND", "That product could not be found.");
  }
}

async function readCart(cart: CartService, identity: CartIdentity): Promise<CartDto | null> {
  try {
    return await cart.getCurrent(identity);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

function requireCustomer(
  context: AiToolContext,
): { ok: true; identity: CartIdentity } | ToolFailure {
  if (!context.userId) {
    return fail("AI_COMMERCE_ACTION_NOT_ALLOWED", "Sign in to continue with Eckam AI.");
  }
  return { ok: true, identity: { kind: "customer", userId: context.userId } };
}

function requireUserId(context: AiToolContext): { ok: true; userId: string } | ToolFailure {
  if (!context.userId) {
    return fail("AI_WISHLIST_AUTH_REQUIRED", "Sign in to continue with Eckam AI.");
  }
  return { ok: true, userId: context.userId };
}

function toSafeCart(cart: CartDto) {
  return {
    itemCount: cart.itemCount,
    currencyCode: cart.currencyCode,
    subtotal: cart.subtotal,
    items: cart.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      productSlug: item.productSlug,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
  };
}

function productFromCartLine(
  line:
    | {
        productId: string;
        productSlug: string;
        productName: string;
        unitPrice?: { amountMinor: string; currencyCode: string } | null;
      }
    | undefined,
  fallback?: Record<string, unknown>,
) {
  if (!line) {
    return fallback ?? null;
  }
  return {
    ...fallback,
    id: line.productId,
    slug: line.productSlug,
    name: line.productName,
    price: line.unitPrice ?? fallback?.price ?? null,
    inStock: true,
    primaryMediaUrl: fallback?.primaryMediaUrl ?? null,
    category: fallback?.category ?? null,
  };
}

function mapCommerceError(error: unknown, fallback: string): ToolFailure {
  if (error instanceof ApiError) {
    if (error.code === "NOT_FOUND") {
      if (/variant/i.test(error.message)) {
        return fail("AI_VARIANT_NOT_FOUND", "That product option is not available.");
      }
      if (/cart item/i.test(error.message)) {
        return fail("AI_CART_ITEM_NOT_FOUND", "That item is not in your cart.");
      }
      if (/wishlist/i.test(error.message)) {
        return fail("AI_COMMERCE_ACTION_FAILED", "That item is not in your wishlist.");
      }
    }
    if (error.code === "UNAUTHORIZED") {
      return fail("AI_WISHLIST_AUTH_REQUIRED", "Sign in to continue with Eckam AI.");
    }
    if (error.code === "VALIDATION_ERROR") {
      return fail("AI_COMMERCE_ACTION_FAILED", fallback);
    }
  }
  return fail("AI_COMMERCE_ACTION_FAILED", fallback);
}

function parseArgs<T>(schema: z.ZodType<T>, args: Record<string, unknown>): T {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    throw new AiToolInvalidArgumentsError();
  }
  return parsed.data;
}

function fail(code: string, message: string): ToolFailure {
  return { ok: false, error: { code, message } };
}
