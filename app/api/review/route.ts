import { NextRequest, NextResponse } from 'next/server';

import { LearnerAccessError, requireVerifiedSession } from '@/lib/auth/learner';
import { listDueReviews, normalizeTimeZone } from '@/lib/services/review-queue';

export async function GET(request: NextRequest) {
  try {
    const session = await requireVerifiedSession();
    const tz = request.nextUrl.searchParams.get('tz');
    const queue = await listDueReviews(session.user.id, session.user.role, tz ? normalizeTimeZone(tz) : undefined);
    return NextResponse.json(queue, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof LearnerAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Review queue failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Your review queue couldn’t be loaded. Try again.' }, { status: 503 });
  }
}
