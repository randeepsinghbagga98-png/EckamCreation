import type { MoneyDto } from "@eckamcreation/api-contracts";
import type { PrismaClient } from "@eckamcreation/database";

export type PriceRow = {
  id: string;
  currencyCode: string;
  countryId: string | null;
  amountMinor: bigint;
  compareAtMinor: bigint | null;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  updatedAt: Date;
};

export function moneyFromMinor(amountMinor: bigint, currencyCode: string): MoneyDto {
  return { amountMinor: amountMinor.toString(), currencyCode };
}

export function isPriceEffective(price: PriceRow, at: Date): boolean {
  if (!price.isActive) return false;
  if (price.startsAt && price.startsAt.getTime() > at.getTime()) return false;
  if (price.endsAt && price.endsAt.getTime() < at.getTime()) return false;
  return true;
}

/**
 * Resolve active price for (variant, currency, optional country).
 * Prefers country-specific rows over global (countryId null).
 */
export function resolvePrice(
  prices: PriceRow[],
  input: { currencyCode: string; countryId?: string | null; at?: Date },
): PriceRow | null {
  const at = input.at ?? new Date();
  const currency = input.currencyCode.toUpperCase();
  const candidates = prices.filter(
    (p) => p.currencyCode.toUpperCase() === currency && isPriceEffective(p, at),
  );
  if (candidates.length === 0) return null;

  if (input.countryId) {
    const countryMatch = candidates
      .filter((p) => p.countryId === input.countryId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    if (countryMatch[0]) return countryMatch[0];
  }

  const global = candidates
    .filter((p) => p.countryId == null)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return global[0] ?? null;
}

export async function resolveCountryId(
  prisma: PrismaClient,
  countryCode?: string | null,
): Promise<string | null> {
  if (!countryCode) return null;
  const code = countryCode.trim().toUpperCase();
  if (code.length === 2) {
    const country = await prisma.country.findFirst({
      where: { iso2: code, isActive: true },
      select: { id: true },
    });
    return country?.id ?? null;
  }
  if (code.length === 3) {
    const country = await prisma.country.findFirst({
      where: { iso3: code, isActive: true },
      select: { id: true },
    });
    return country?.id ?? null;
  }
  return null;
}

export function availableUnits(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

export class PricingService {
  constructor(private readonly prisma: PrismaClient) {}

  async getVariantPrice(
    variantId: string,
    input: { currencyCode: string; countryCode?: string | null },
  ) {
    const countryId = await resolveCountryId(this.prisma, input.countryCode);
    const prices = await this.prisma.price.findMany({
      where: { variantId, currencyCode: input.currencyCode.toUpperCase(), isActive: true },
    });
    const resolved = resolvePrice(prices, {
      currencyCode: input.currencyCode,
      countryId,
    });
    if (!resolved) return null;
    return {
      price: moneyFromMinor(resolved.amountMinor, resolved.currencyCode),
      compareAtPrice: resolved.compareAtMinor
        ? moneyFromMinor(resolved.compareAtMinor, resolved.currencyCode)
        : null,
      priceId: resolved.id,
      countryId: resolved.countryId,
    };
  }
}
