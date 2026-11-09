import { NextResponse } from 'next/server';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import {
  DEFAULT_ENGAGEMENT_DAYS,
  ENGAGEMENT_WINDOWS,
  refreshEngagedTag,
} from '@/lib/services/subscriber-engagement';

/**
 * Tags confirmed subscribers who opened or clicked an issue in the last `days`
 * days as "engaged" (and removes the tag from everyone else), so a campaign can be
 * sent to "Only subscribers tagged… engaged".
 */
export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json().catch(() => ({}))) as { days?: unknown };
    const days = ENGAGEMENT_WINDOWS.includes(body.days as (typeof ENGAGEMENT_WINDOWS)[number])
      ? (body.days as number)
      : DEFAULT_ENGAGEMENT_DAYS;

    await connectDB();
    const result = await refreshEngagedTag(days);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Engaged tag refresh failed:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
