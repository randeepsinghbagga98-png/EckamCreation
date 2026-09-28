import { prisma } from "@eckamcreation/database";
import { BrandService } from "./brand-service";
import { CategoryService } from "./category-service";
import { CollectionService } from "./collection-service";
import { PricingService } from "./pricing";
import { ProductService } from "./product-service";

let products: ProductService | null = null;
let categories: CategoryService | null = null;
let brands: BrandService | null = null;
let collections: CollectionService | null = null;
let pricing: PricingService | null = null;

export function getProductService() {
  if (!products) products = new ProductService(prisma);
  return products;
}

export function getCategoryService() {
  if (!categories) categories = new CategoryService(prisma);
  return categories;
}

export function getBrandService() {
  if (!brands) brands = new BrandService(prisma);
  return brands;
}

export function getCollectionService() {
  if (!collections) collections = new CollectionService(prisma);
  return collections;
}

export function getPricingService() {
  if (!pricing) pricing = new PricingService(prisma);
  return pricing;
}

export function resetCatalogueServices() {
  products = null;
  categories = null;
  brands = null;
  collections = null;
  pricing = null;
}

export {
  ProductService,
  CategoryService,
  BrandService,
  CollectionService,
  PricingService,
};
