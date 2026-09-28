/** Stable path constants for /v1. */

export const paths = {
  root: "/",
  v1: "/v1",
  health: "/v1/health",

  catalogue: {
    categories: "/v1/catalogue/categories",
    category: (idOrSlug: string) => `/v1/catalogue/categories/${idOrSlug}`,
    brands: "/v1/catalogue/brands",
    brand: (idOrSlug: string) => `/v1/catalogue/brands/${idOrSlug}`,
    collections: "/v1/catalogue/collections",
    collection: (idOrSlug: string) => `/v1/catalogue/collections/${idOrSlug}`,
    products: "/v1/catalogue/products",
    product: (idOrSlug: string) => `/v1/catalogue/products/${idOrSlug}`,
    productVariants: (idOrSlug: string) => `/v1/catalogue/products/${idOrSlug}/variants`,
    productMedia: (idOrSlug: string) => `/v1/catalogue/products/${idOrSlug}/media`,
    variant: (id: string) => `/v1/catalogue/variants/${id}`,
    variantPrice: (id: string) => `/v1/catalogue/variants/${id}/price`,
  },

  search: "/v1/search",
  searchNatural: "/v1/search/natural",

  auth: {
    session: "/v1/auth/session",
    register: "/v1/auth/register",
    login: "/v1/auth/login",
    logout: "/v1/auth/logout",
    staff: {
      session: "/v1/auth/staff/session",
      login: "/v1/auth/staff/login",
      logout: "/v1/auth/staff/logout",
    },
  },

  me: {
    root: "/v1/me",
    addresses: "/v1/me/addresses",
    address: (id: string) => `/v1/me/addresses/${id}`,
    consents: "/v1/me/consents",
    notificationPreferences: "/v1/me/notification-preferences",
    wishlist: "/v1/me/wishlist",
    wishlistItems: "/v1/me/wishlist/items",
    wishlistItem: (variantId: string) => `/v1/me/wishlist/items/${variantId}`,
    orders: "/v1/me/orders",
    order: (idOrNumber: string) => `/v1/me/orders/${idOrNumber}`,
    orderShipments: (idOrNumber: string) => `/v1/me/orders/${idOrNumber}/shipments`,
    orderCancellations: (idOrNumber: string) => `/v1/me/orders/${idOrNumber}/cancellations`,
  },

  carts: {
    create: "/v1/carts",
    current: "/v1/carts/current",
    items: "/v1/carts/current/items",
    item: (itemId: string) => `/v1/carts/current/items/${itemId}`,
    merge: "/v1/carts/merge",
  },

  wishlists: {
    root: "/v1/wishlists",
    items: (id: string) => `/v1/wishlists/${id}/items`,
    item: (id: string, itemId: string) => `/v1/wishlists/${id}/items/${itemId}`,
  },

  checkout: {
    sessions: "/v1/checkout/sessions",
    session: (id: string) => `/v1/checkout/sessions/${id}`,
    quote: (id: string) => `/v1/checkout/sessions/${id}/quote`,
    complete: (id: string) => `/v1/checkout/sessions/${id}/complete`,
    paymentIntent: (id: string) => `/v1/checkout/sessions/${id}/payment-intent`,
  },

  orders: {
    root: "/v1/orders",
    one: (idOrNumber: string) => `/v1/orders/${idOrNumber}`,
    cancellations: (id: string) => `/v1/orders/${id}/cancellations`,
    shipments: (id: string) => `/v1/orders/${id}/shipments`,
    returns: (id: string) => `/v1/orders/${id}/returns`,
  },

  payments: {
    intents: "/v1/payments/intents",
    intent: (id: string) => `/v1/payments/intents/${id}`,
    initiate: (id: string) => `/v1/payments/intents/${id}/initiate`,
  },

  shippingQuote: "/v1/shipping/quote",

  webhooks: {
    payments: (provider: string) => `/v1/webhooks/payments/${provider}`,
    whatsapp: "/v1/webhooks/whatsapp",
  },

  ai: {
    conversations: "/v1/ai/conversations",
    conversation: (id: string) => `/v1/ai/conversations/${id}`,
    messages: (id: string) => `/v1/ai/conversations/${id}/messages`,
  },

  support: {
    tickets: "/v1/support/tickets",
    ticket: (id: string) => `/v1/support/tickets/${id}`,
    messages: (id: string) => `/v1/support/tickets/${id}/messages`,
  },
} as const;

export const adminPaths = {
  dashboard: "/v1/admin/dashboard",
  products: "/v1/admin/products",
  product: (id: string) => `/v1/admin/products/${id}`,
  productPublish: (id: string) => `/v1/admin/products/${id}/publish`,
  productUnpublish: (id: string) => `/v1/admin/products/${id}/unpublish`,
  productVariants: (id: string) => `/v1/admin/products/${id}/variants`,
  variants: "/v1/admin/variants",
  variant: (id: string) => `/v1/admin/variants/${id}`,
  prices: "/v1/admin/prices",
  variantPrices: (id: string) => `/v1/admin/variants/${id}/prices`,
  categories: "/v1/admin/categories",
  category: (id: string) => `/v1/admin/categories/${id}`,
  brands: "/v1/admin/brands",
  brand: (id: string) => `/v1/admin/brands/${id}`,
  collections: "/v1/admin/collections",
  collection: (id: string) => `/v1/admin/collections/${id}`,
  collectionProducts: (id: string) => `/v1/admin/collections/${id}/products`,
  collectionProduct: (id: string, productId: string) =>
    `/v1/admin/collections/${id}/products/${productId}`,
  inventory: "/v1/admin/inventory",
  inventoryItem: (id: string) => `/v1/admin/inventory/${id}`,
  inventoryMovements: (id: string) => `/v1/admin/inventory/${id}/movements`,
  inventoryAdjust: "/v1/admin/inventory/adjust",
  orders: "/v1/admin/orders",
  order: (id: string) => `/v1/admin/orders/${id}`,
  orderStatus: (id: string) => `/v1/admin/orders/${id}/status`,
  orderCancellations: (id: string) => `/v1/admin/orders/${id}/cancellations`,
  orderShipments: (id: string) => `/v1/admin/orders/${id}/shipments`,
  shipments: "/v1/admin/shipments",
  shipment: (id: string) => `/v1/admin/shipments/${id}`,
  shipmentStatus: (id: string) => `/v1/admin/shipments/${id}/status`,
  customers: "/v1/admin/customers",
  customer: (id: string) => `/v1/admin/customers/${id}`,
  payments: "/v1/admin/payments/intents",
  payment: (id: string) => `/v1/admin/payments/intents/${id}`,
  paymentRefund: (id: string) => `/v1/admin/payments/intents/${id}/refund`,
  promotions: "/v1/admin/promotions",
  reviews: "/v1/admin/reviews",
  roles: "/v1/admin/roles",
  auditLogs: "/v1/admin/audit-logs",
} as const;

export const contractGroups = [
  "health",
  "catalogue",
  "search",
  "auth",
  "cart",
  "wishlist",
  "checkout",
  "orders",
  "payments",
  "shipping",
  "webhooks",
  "ai",
  "support",
  "admin",
] as const;

export type ContractGroup = (typeof contractGroups)[number];
