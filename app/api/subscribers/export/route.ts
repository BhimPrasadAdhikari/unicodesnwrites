import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import { toCSV } from '@/lib/utils/csv';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

export async function GET() {
    try {
        await requireAdminSession();
        await dbConnect();
        
        const subscribers = await Subscriber.find({ status: 'confirmed' })
            .select('email name source subscribedAt status')
            .lean();
            
        const csvData = subscribers.map(sub => ({
            email: sub.email,
            name: sub.name || '',
            status: sub.status,
            source: sub.source,
            joined_at: sub.subscribedAt ? new Date(sub.subscribedAt).toISOString() : '',
        }));
        
        const csv = toCSV(csvData, ['email', 'name', 'status', 'source', 'joined_at']);
        
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Export error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
