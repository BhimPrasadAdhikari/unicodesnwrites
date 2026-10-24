import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { getTrafficSources } from '@/lib/services/analytics-session';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const sources = await getTrafficSources({ range, start: customStart, end: customEnd });
    return NextResponse.json({ sources });
    
  } catch (error) {
    console.error('Traffic sources error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
