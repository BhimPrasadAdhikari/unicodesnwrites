import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminIdRoute, readJson } from '@/lib/auth/admin-route';
import { ContactSubmission } from '@/lib/models/ContactSubmission';

const patchSchema = z.object({ status: z.enum(['new', 'read', 'replied']) });

export const PATCH = adminIdRoute(async ({ request, id }) => {
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  const updated = await ContactSubmission.findByIdAndUpdate(id, { status: parsed.data.status }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});

export const DELETE = adminIdRoute(async ({ id }) => {
  const deleted = await ContactSubmission.findByIdAndDelete(id).lean();
  if (!deleted) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});
