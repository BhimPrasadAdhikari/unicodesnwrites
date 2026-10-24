import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { AnalyticsReportError, getContentAnalytics } from '@/lib/services/analytics-session';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'blog'; // blog, projects, products
    const range = searchParams.get('range') || '7days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const content = await getContentAnalytics({ type, range, start: customStart, end: customEnd });
    return NextResponse.json({ content });
    
  } catch (error) {
    if (error instanceof AnalyticsReportError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Content analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
