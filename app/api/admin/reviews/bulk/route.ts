import { NextResponse } from 'next/server';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { readJson } from '@/lib/auth/admin-route';
import { connectDB } from '@/lib/db/connection';
import { recordAdminAction } from '@/lib/services/admin-audit';
import { bulkModerationSchema, moderate } from '@/lib/services/moderation';

/** Approves, hides or deletes up to 100 reviews at once; logs one audit entry. */
export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const parsed = bulkModerationSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: 'Choose 1-100 reviews and an action' }, { status: 400 });
    const ids = [...new Set(parsed.data.ids)];
    const { action } = parsed.data;
    await connectDB();
    const updated = await moderate('reviews', ids, action);
    await recordAdminAction(session, {
      action: `bulk-${action}`,
      targetType: 'reviews',
      summary: `${action} ${updated} of ${ids.length} selected reviews`,
    });
    return NextResponse.json({ updated });
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Bulk review moderation failed', error);
    return NextResponse.json({ error: 'Bulk moderation failed' }, { status: 500 });
  }
}
