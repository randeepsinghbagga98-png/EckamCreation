import type { PrismaClient } from "@eckamcreation/database";
import { moneyFromBigInt } from "@eckamcreation/api-contracts";
import type { ShippingQuoteOption } from "@eckamcreation/api-contracts";

export type ShippingOption = {
  methodId: string;
  code: string;
  name: string;
  amountMinor: bigint;
  currencyCode: string;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
};

/**
 * Destination-aware shipping options from ShippingZone → Method → Rate.
 */
export class ShippingService {
  constructor(private readonly prisma: PrismaClient) {}

  async listOptions(input: {
    countryId: string;
    currencyCode: string;
    subtotalMinor: bigint;
    weightGrams?: number | null;
  }): Promise<ShippingOption[]> {
    const currencyCode = input.currencyCode.toUpperCase();
    const zones = await this.prisma.shippingZone.findMany({
      where: {
        isActive: true,
        zoneCountries: { some: { countryId: input.countryId } },
      },
      include: {
        methods: {
          where: { isActive: true },
          include: {
            rates: {
              where: { isActive: true, currencyCode },
            },
          },
        },
      },
    });

    const options: ShippingOption[] = [];
    for (const zone of zones) {
      for (const method of zone.methods) {
        const rate = pickRate(method.rates, input.subtotalMinor, input.weightGrams ?? null);
        if (!rate) continue;
        options.push({
          methodId: method.id,
          code: method.code,
          name: method.name,
          amountMinor: rate.amountMinor,
          currencyCode: rate.currencyCode,
          estimatedDaysMin: method.estimatedDaysMin,
          estimatedDaysMax: method.estimatedDaysMax,
        });
      }
    }

    return options.sort((a, b) => {
      if (a.amountMinor === b.amountMinor) return a.code.localeCompare(b.code);
      return a.amountMinor < b.amountMinor ? -1 : 1;
    });
  }

  async resolveMethodAmount(input: {
    shippingMethodId: string;
    countryId: string;
    currencyCode: string;
    subtotalMinor: bigint;
    weightGrams?: number | null;
  }): Promise<ShippingOption | null> {
    const options = await this.listOptions(input);
    return options.find((o) => o.methodId === input.shippingMethodId) ?? null;
  }

  toDto(option: ShippingOption): ShippingQuoteOption {
    return {
      methodId: option.methodId,
      code: option.code,
      name: option.name,
      amount: moneyFromBigInt(option.amountMinor, option.currencyCode),
      estimatedDaysMin: option.estimatedDaysMin,
      estimatedDaysMax: option.estimatedDaysMax,
    };
  }
}

function pickRate(
  rates: Array<{
    amountMinor: bigint;
    currencyCode: string;
    minSubtotalMinor: bigint | null;
    maxSubtotalMinor: bigint | null;
    minWeightGrams: number | null;
    maxWeightGrams: number | null;
    isActive: boolean;
  }>,
  subtotalMinor: bigint,
  weightGrams: number | null,
) {
  const matches = rates.filter((r) => {
    if (!r.isActive) return false;
    if (r.minSubtotalMinor != null && subtotalMinor < r.minSubtotalMinor) return false;
    if (r.maxSubtotalMinor != null && subtotalMinor > r.maxSubtotalMinor) return false;
    if (weightGrams != null) {
      if (r.minWeightGrams != null && weightGrams < r.minWeightGrams) return false;
      if (r.maxWeightGrams != null && weightGrams > r.maxWeightGrams) return false;
    }
    return true;
  });
  matches.sort((a, b) => {
    const aMax = a.maxSubtotalMinor ?? BigInt(Number.MAX_SAFE_INTEGER);
    const bMax = b.maxSubtotalMinor ?? BigInt(Number.MAX_SAFE_INTEGER);
    if (aMax !== bMax) return aMax < bMax ? -1 : 1;
    if (a.amountMinor === b.amountMinor) return 0;
    return a.amountMinor < b.amountMinor ? -1 : 1;
  });
  return matches[0] ?? null;
}
