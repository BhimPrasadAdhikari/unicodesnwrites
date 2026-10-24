import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { getAiTelemetryOverview } from '@/lib/services/ai-telemetry';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const telemetry = await getAiTelemetryOverview({ range, start: customStart, end: customEnd });
    return NextResponse.json(telemetry);
  } catch (error) {
    console.error('AI telemetry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
