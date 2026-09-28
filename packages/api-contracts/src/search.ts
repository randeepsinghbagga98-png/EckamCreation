import { z } from "zod";
import { cursorQuerySchema } from "./common";

export const searchQuerySchema = cursorQuerySchema.extend({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  priceMin: z.string().regex(/^\d+$/).optional(),
  priceMax: z.string().regex(/^\d+$/).optional(),
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  availability: z.enum(["in-stock", "out-of-stock"]).optional(),
  shipToCountry: z.string().optional(),
  currency: z.string().length(3).optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest", "rating"]).optional(),
});

export const naturalSearchBodySchema = z.object({
  query: z.string().min(1).max(2000),
  currency: z.string().length(3).optional(),
  shipToCountry: z.string().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type NaturalSearchBody = z.infer<typeof naturalSearchBodySchema>;
