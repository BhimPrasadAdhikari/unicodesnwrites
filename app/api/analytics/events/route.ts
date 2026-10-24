import { NextRequest, NextResponse } from 'next/server';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { getEventAnalytics } from '@/lib/services/analytics-session';

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const searchParams = request.nextUrl.searchParams;
    const requestedLimit = Number(searchParams.get('limit') || 10);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
    return NextResponse.json(await getEventAnalytics({
      range: searchParams.get('range') || '7days',
      start: searchParams.get('start'),
      end: searchParams.get('end'),
      limit,
    }));
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
