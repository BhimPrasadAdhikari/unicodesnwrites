import type Stripe from 'stripe';

import { stripe } from '@/lib/services/stripe';

export type CouponRow = {
  id: string;
  code: string;
  active: boolean;
  discount: string;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  createdAt: string;
};

function describe(coupon: Stripe.Coupon | string | null) {
  if (!coupon || typeof coupon === 'string') return '—';
  if (coupon.percent_off) return `${coupon.percent_off}% off`;
  if (coupon.amount_off) return `${(coupon.amount_off / 100).toFixed(2)} ${(coupon.currency || 'usd').toUpperCase()} off`;
  return '—';
}

/** Promotion codes buyers can type at Stripe checkout, newest first. */
export async function listCoupons(): Promise<CouponRow[]> {
  const codes = await stripe.promotionCodes.list({ limit: 100, expand: ['data.promotion.coupon'] });
  return codes.data.map((code) => ({
    id: code.id,
    code: code.code,
    active: code.active,
    discount: describe(code.promotion?.coupon ?? null),
    timesRedeemed: code.times_redeemed,
    maxRedemptions: code.max_redemptions ?? null,
    expiresAt: code.expires_at ? new Date(code.expires_at * 1000).toISOString() : null,
    createdAt: new Date(code.created * 1000).toISOString(),
  }));
}

export async function createCoupon(input: {
  code: string;
  percentOff?: number;
  amountOffCents?: number;
  currency?: string;
  maxRedemptions?: number;
  expiresAt?: Date;
}) {
  const coupon = await stripe.coupons.create({
    duration: 'once',
    name: input.code,
    ...(input.percentOff ? { percent_off: input.percentOff } : { amount_off: input.amountOffCents, currency: (input.currency || 'usd').toLowerCase() }),
  });
  return stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    code: input.code,
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
    ...(input.expiresAt ? { expires_at: Math.floor(input.expiresAt.getTime() / 1000) } : {}),
  });
}

export async function setCouponActive(id: string, active: boolean) {
  return stripe.promotionCodes.update(id, { active });
}
