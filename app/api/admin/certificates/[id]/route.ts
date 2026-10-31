import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminIdRoute, readJson } from '@/lib/auth/admin-route';
import { setCertificateRevoked } from '@/lib/services/certificates';

const patchSchema = z.object({ revoked: z.boolean() }).strict();

/** Revoke or restore a certificate. adminIdRoute records it in the admin audit log. */
export const PATCH = adminIdRoute(async ({ request, id }) => {
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const updated = await setCertificateRevoked(id, parsed.data.revoked);
  if (!updated) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  return NextResponse.json({ ok: true, revoked: Boolean(updated.revokedAt) });
});
