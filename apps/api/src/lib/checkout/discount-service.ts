import type { PrismaClient } from "@eckamcreation/database";
import { validationError } from "../errors";

export type DiscountQuoteResult = {
  applied: boolean;
  discountMinor: bigint;
  currencyCode: string;
  promotionId: string | null;
  couponCode: string | null;
  freeShipping: boolean;
  reason?: string;
};

/**
 * Coupon / promotion discount boundary.
 * Never trusts client-supplied discount amounts.
 */
export class DiscountService {
  constructor(private readonly prisma: PrismaClient) {}

  async quote(input: {
    couponCode: string | null | undefined;
    currencyCode: string;
    subtotalMinor: bigint;
    countryId?: string | null;
    userId?: string | null;
    at?: Date;
  }): Promise<DiscountQuoteResult> {
    const currencyCode = input.currencyCode.toUpperCase();
    const empty: DiscountQuoteResult = {
      applied: false,
      discountMinor: BigInt(0),
      currencyCode,
      promotionId: null,
      couponCode: null,
      freeShipping: false,
    };

    const code = input.couponCode?.trim();
    if (!code) return empty;

    const at = input.at ?? new Date();
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      include: {
        promotion: {
          include: { rules: true },
        },
      },
    });

    if (!coupon || !coupon.isActive) {
      throw validationError("Invalid coupon code");
    }
    if (coupon.startsAt && coupon.startsAt.getTime() > at.getTime()) {
      throw validationError("Coupon is not yet active");
    }
    if (coupon.endsAt && coupon.endsAt.getTime() < at.getTime()) {
      throw validationError("Coupon has expired");
    }

    const promo = coupon.promotion;
    if (!promo.isActive) throw validationError("Promotion is inactive");
    if (promo.startsAt && promo.startsAt.getTime() > at.getTime()) {
      throw validationError("Promotion is not yet active");
    }
    if (promo.endsAt && promo.endsAt.getTime() < at.getTime()) {
      throw validationError("Promotion has expired");
    }
    if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
      throw validationError("Promotion usage limit reached");
    }
    if (promo.currencyCode && promo.currencyCode !== currencyCode) {
      throw validationError("Coupon currency mismatch");
    }

    if (promo.perCustomerLimit != null && input.userId) {
      const used = await this.prisma.promotionUsage.count({
        where: { promotionId: promo.id, userId: input.userId },
      });
      if (used >= promo.perCustomerLimit) {
        throw validationError("Customer promotion usage limit reached");
      }
    }

    for (const rule of promo.rules) {
      if (rule.ruleType === "MIN_ORDER_VALUE" && rule.minOrderMinor != null) {
        if (input.subtotalMinor < rule.minOrderMinor) {
          throw validationError("Order does not meet coupon minimum");
        }
      }
      if (rule.ruleType === "COUNTRY" && rule.countryId) {
        if (!input.countryId || rule.countryId !== input.countryId) {
          throw validationError("Coupon is not valid for this destination");
        }
      }
    }

    let discountMinor = BigInt(0);
    let freeShipping = false;

    if (promo.type === "FIXED_AMOUNT") {
      discountMinor = BigInt(promo.value);
      if (discountMinor > input.subtotalMinor) discountMinor = input.subtotalMinor;
    } else if (promo.type === "PERCENTAGE") {
      discountMinor = (input.subtotalMinor * BigInt(promo.value)) / BigInt(10000);
      if (discountMinor > input.subtotalMinor) discountMinor = input.subtotalMinor;
    } else if (promo.type === "FREE_SHIPPING") {
      freeShipping = true;
      discountMinor = BigInt(0);
    }

    return {
      applied: true,
      discountMinor,
      currencyCode,
      promotionId: promo.id,
      couponCode: coupon.code,
      freeShipping,
    };
  }
}
