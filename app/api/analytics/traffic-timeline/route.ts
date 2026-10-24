import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { getTrafficTimeline } from '@/lib/services/analytics-session';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const timeline = await getTrafficTimeline({ range, start: customStart, end: customEnd });
    return NextResponse.json({ timeline });
    
  } catch (error) {
    console.error('Traffic timeline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
