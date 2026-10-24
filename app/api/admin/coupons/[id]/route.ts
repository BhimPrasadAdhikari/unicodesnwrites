import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { setCouponActive } from '@/lib/services/coupons';

const schema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    if (!/^promo_[A-Za-z0-9]+$/.test(id)) return NextResponse.json({ error: 'Invalid coupon' }, { status: 400 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid change' }, { status: 400 });
    await setCouponActive(id, parsed.data.active);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Coupon update failed', error);
    return NextResponse.json({ error: 'Could not update the coupon' }, { status: 400 });
  }
}
