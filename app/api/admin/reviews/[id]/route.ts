import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminIdRoute, readJson } from '@/lib/auth/admin-route';
import Review from '@/lib/models/Review';

const patchSchema = z.object({ approved: z.boolean() });

export const PATCH = adminIdRoute(async ({ request, id }) => {
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid approval state' }, { status: 400 });
  const updated = await Review.findByIdAndUpdate(id, { approved: parsed.data.approved }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});

export const DELETE = adminIdRoute(async ({ id }) => {
  const deleted = await Review.findByIdAndDelete(id).lean();
  if (!deleted) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});
