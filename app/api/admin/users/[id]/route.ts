import { NextResponse } from 'next/server';
import { z } from 'zod';

import { adminIdRoute, readJson } from '@/lib/auth/admin-route';
import { User } from '@/lib/models/User';

const patchSchema = z
  .object({
    role: z.enum(['admin', 'author', 'learner']).optional(),
    verified: z.boolean().optional(),
    /** Ends every session the user has open (bumps tokenVersion) */
    signOut: z.literal(true).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to change');

export const PATCH = adminIdRoute(async ({ request, id, session }) => {
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid change' }, { status: 400 });
  const { role, verified, signOut } = parsed.data;

  // Guard against locking yourself out of the studio.
  if (id === session.user.id && ((role && role !== 'admin') || signOut)) {
    return NextResponse.json({ error: 'You can’t demote or sign out your own account here.' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (role) update.role = role;
  if (verified === true) update.emailVerified = new Date();
  if (verified === false) update.$unset = { emailVerified: 1 };
  // A role change also ends existing sessions so the new role applies at once.
  if (signOut || role) update.$inc = { tokenVersion: 1 };

  const updated = await User.findByIdAndUpdate(id, update, { new: true }).select('_id').lean();
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});
