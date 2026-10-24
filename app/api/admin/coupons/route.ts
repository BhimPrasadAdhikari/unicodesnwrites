import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { createCoupon } from '@/lib/services/coupons';

const schema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,30}$/, 'Use 3–30 letters or digits'),
    percentOff: z.number().min(1).max(100).optional(),
    amountOff: z.number().min(0.5).max(10_000).optional(),
    maxRedemptions: z.number().int().min(1).max(100_000).optional(),
    expiresAt: z.string().optional(),
  })
  .refine((value) => Boolean(value.percentOff) !== Boolean(value.amountOff), 'Choose a percentage or a fixed amount');

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid coupon' }, { status: 400 });
    }
    const { code, percentOff, amountOff, maxRedemptions, expiresAt } = parsed.data;
    const expires = expiresAt ? new Date(expiresAt) : undefined;
    if (expires && (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now())) {
      return NextResponse.json({ error: 'Expiry must be a future date' }, { status: 400 });
    }
    await createCoupon({ code, percentOff, amountOffCents: amountOff ? Math.round(amountOff * 100) : undefined, maxRedemptions, expiresAt: expires });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    const message = (error as { type?: string; message?: string }).type?.startsWith('Stripe') ? (error as { message: string }).message : 'Could not create the coupon';
    console.error('Coupon create failed', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
