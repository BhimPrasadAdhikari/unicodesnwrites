import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { AnalyticsReportError, getPostAnalytics } from '@/lib/services/analytics-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    return NextResponse.json(await getPostAnalytics(id, { range, start: customStart, end: customEnd }));
    
  } catch (error) {
    if (error instanceof AnalyticsReportError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Post analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
