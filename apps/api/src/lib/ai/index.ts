import {
  AiProviderRegistry,
  AiToolRegistry,
  DEVELOPMENT_AI_PROVIDER_ID,
  DevelopmentAiProvider,
  createAiProviderRegistryFromEnv,
  createEckamAiService,
  preferredAiProviderId,
  type EckamAiService,
} from "@eckamcreation/ai";
import { prisma } from "@eckamcreation/database";
import { getCartService } from "../cart";
import { getCategoryService, getProductService } from "../catalogue";
import { getCustomerService } from "../customer";
import { getOrderService } from "../orders";
import { createCatalogueAiTools } from "./catalogue-tools";
import { createCommerceAiTools } from "./commerce-tools";
import { createCustomerAiTools } from "./customer-tools";
import { AiConversationService } from "./conversation-service";

let registry: AiProviderRegistry | null = null;
let toolRegistry: AiToolRegistry | null = null;
let developmentProvider: DevelopmentAiProvider | null = null;
let aiService: EckamAiService | null = null;
let conversationService: AiConversationService | null = null;

export function getAiRegistry(): AiProviderRegistry {
  if (!registry) {
    registry = createAiProviderRegistryFromEnv({
      NODE_ENV: process.env.NODE_ENV,
      AI_PROVIDER: process.env.AI_PROVIDER,
      AI_API_KEY: process.env.AI_API_KEY,
      AI_MODEL: process.env.AI_MODEL,
      AI_API_BASE_URL: process.env.AI_API_BASE_URL,
    });
    const registered = registry.get(DEVELOPMENT_AI_PROVIDER_ID);
    developmentProvider = registered instanceof DevelopmentAiProvider ? registered : null;
  }
  return registry;
}

export function getAiToolRegistry(): AiToolRegistry {
  if (!toolRegistry) {
    toolRegistry = new AiToolRegistry();
    for (const tool of [
      ...createCatalogueAiTools({
        products: getProductService(),
        categories: getCategoryService(),
      }),
      ...createCommerceAiTools({
        cart: getCartService(),
        customers: getCustomerService(),
        products: getProductService(),
      }),
      ...createCustomerAiTools({
        customers: getCustomerService(),
        orders: getOrderService(),
      }),
    ]) {
      toolRegistry.register(tool);
    }
  }
  return toolRegistry;
}

export function getDevelopmentAiProvider(): DevelopmentAiProvider | null {
  getAiRegistry();
  return developmentProvider;
}

export function getEckamAiService(): EckamAiService {
  if (!aiService) {
    aiService = createEckamAiService(
      getAiRegistry(),
      preferredAiProviderId(process.env),
      getAiToolRegistry(),
    );
  }
  return aiService;
}

export function getAiConversationService(): AiConversationService {
  if (!conversationService) {
    conversationService = new AiConversationService(prisma, getEckamAiService());
  }
  return conversationService;
}

/** Test hook */
export function resetAiServices(): void {
  registry = null;
  toolRegistry = null;
  developmentProvider = null;
  aiService = null;
  conversationService = null;
}

export function setAiConversationServiceForTest(service: AiConversationService): void {
  conversationService = service;
}

export { AiConversationService };
export { DEVELOPMENT_AI_PROVIDER_ID };
