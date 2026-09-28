import type { PrismaClient } from "@eckamcreation/database";
import { moneyFromBigInt, type MoneyDto } from "@eckamcreation/api-contracts";

export type TaxQuoteResult = {
  configured: boolean;
  taxMinor: bigint;
  currencyCode: string;
  taxCode: string | null;
  rateBps: number | null;
  inclusive: boolean;
};

/**
 * Tax calculation boundary using TaxRule + TaxRate (basis points).
 * If no active rule matches the destination country, returns configured=false and tax=0.
 */
export class TaxService {
  constructor(private readonly prisma: PrismaClient) {}

  async quote(input: {
    countryId: string | null;
    regionId?: string | null;
    taxableMinor: bigint;
    currencyCode: string;
    at?: Date;
  }): Promise<TaxQuoteResult> {
    const currencyCode = input.currencyCode.toUpperCase();
    if (!input.countryId || input.taxableMinor <= BigInt(0)) {
      return {
        configured: false,
        taxMinor: BigInt(0),
        currencyCode,
        taxCode: null,
        rateBps: null,
        inclusive: false,
      };
    }

    const at = input.at ?? new Date();
    const rules = await this.prisma.taxRule.findMany({
      where: {
        isActive: true,
        OR: [{ countryId: input.countryId }, { countryId: null }],
      },
      include: {
        rates: {
          where: { isActive: true },
        },
      },
      orderBy: { priority: "asc" },
    });

    // Prefer country+region, then country, then global
    const ranked = [...rules].sort((a, b) => {
      const score = (r: typeof a) => {
        if (input.regionId && r.regionId === input.regionId) return 0;
        if (r.countryId === input.countryId && !r.regionId) return 1;
        if (!r.countryId) return 3;
        return 2;
      };
      const diff = score(a) - score(b);
      return diff !== 0 ? diff : a.priority - b.priority;
    });

    for (const rule of ranked) {
      if (rule.regionId && input.regionId && rule.regionId !== input.regionId) continue;
      if (rule.regionId && !input.regionId) continue;
      if (rule.countryId && rule.countryId !== input.countryId) continue;

      const rate = rule.rates.find((r) => {
        if (r.validFrom && r.validFrom.getTime() > at.getTime()) return false;
        if (r.validTo && r.validTo.getTime() < at.getTime()) return false;
        return true;
      });
      if (!rate) continue;

      // Exclusive tax: floor(taxable * bps / 10000)
      const taxMinor = rate.inclusive
        ? BigInt(0) // prices assumed exclusive for checkout; inclusive handled as 0 delta
        : (input.taxableMinor * BigInt(rate.rateBps)) / BigInt(10000);

      return {
        configured: true,
        taxMinor,
        currencyCode,
        taxCode: rate.taxCode,
        rateBps: rate.rateBps,
        inclusive: rate.inclusive,
      };
    }

    return {
      configured: false,
      taxMinor: BigInt(0),
      currencyCode,
      taxCode: null,
      rateBps: null,
      inclusive: false,
    };
  }

  toMoney(result: TaxQuoteResult): MoneyDto {
    return moneyFromBigInt(result.taxMinor, result.currencyCode);
  }
}
