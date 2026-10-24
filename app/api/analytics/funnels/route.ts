import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { getConversionFunnels } from '@/lib/services/analytics-session';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    return NextResponse.json({
      funnels: await getConversionFunnels({ range, start: customStart, end: customEnd }),
    });
    
  } catch (error) {
    console.error('Funnels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
