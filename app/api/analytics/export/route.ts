import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { analyticsEventsToCSV, getAnalyticsExport } from '@/lib/services/analytics-session';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const searchParams = request.nextUrl.searchParams;
    const formatType = searchParams.get('format') || 'json'; // json or csv
    const range = searchParams.get('range') || '30days';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const exportData = await getAnalyticsExport({ range, start: customStart, end: customEnd });
    
    if (formatType === 'json') {
      return NextResponse.json({ 
        range: { start: exportData.range.start, end: exportData.range.end },
        count: exportData.count,
        events: exportData.events,
      });
    } else if (formatType === 'csv') {
      const csvContent = analyticsEventsToCSV(exportData.events);
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics_export_${format(new Date(), 'yyyy-MM-dd')}.csv"`,
        },
      });
    }
    
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
