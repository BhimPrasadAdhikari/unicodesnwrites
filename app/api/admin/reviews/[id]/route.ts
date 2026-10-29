import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminIdRoute, readJson } from '@/lib/auth/admin-route';
import { moderate } from '@/lib/services/moderation';

const patchSchema = z.object({ approved: z.boolean() });

export const PATCH = adminIdRoute(async ({ request, id }) => {
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid approval state' }, { status: 400 });
  const matched = await moderate('reviews', [id], parsed.data.approved ? 'approve' : 'hide');
  if (!matched) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});

export const DELETE = adminIdRoute(async ({ id }) => {
  const deleted = await moderate('reviews', [id], 'delete');
  if (!deleted) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});
