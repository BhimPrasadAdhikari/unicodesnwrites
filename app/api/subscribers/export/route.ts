import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber, { type ISubscriber } from '@/lib/models/Subscriber';
import { toCSV } from '@/lib/utils/csv';
import { cleanSingleLine } from '@/lib/utils/sanitize';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

const FIELDS = ['email', 'name', 'status', 'source', 'joined_at'];
const BATCH = 500;
const STATUSES = new Set<ISubscriber['status']>(['pending', 'confirmed', 'unsubscribed']);

export async function GET(req: NextRequest) {
    try {
        await requireAdminSession();
        await dbConnect();

        // Same q/status filters as the subscribers page; with no status it exports
        // confirmed subscribers only, as it always has.
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') as ISubscriber['status'] | null;
        const query: Record<string, unknown> = { status: status && STATUSES.has(status) ? status : 'confirmed' };
        const search = cleanSingleLine(searchParams.get('q') || '').slice(0, 254);
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { email: { $regex: escapedSearch, $options: 'i' } },
                { name: { $regex: escapedSearch, $options: 'i' } },
            ];
        }

        // Stream from a cursor so a large list is never held in memory at once.
        const cursor = Subscriber.find(query)
            .sort({ _id: 1 })
            .select('email name source subscribedAt status')
            .lean()
            .cursor();
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    controller.enqueue(encoder.encode(toCSV([], FIELDS)));
                    let batch: Record<string, string>[] = [];
                    const flush = () => {
                        if (!batch.length) return;
                        controller.enqueue(encoder.encode(`${toCSV(batch, FIELDS, { header: false })}\n`));
                        batch = [];
                    };
                    for await (const sub of cursor) {
                        batch.push({
                            email: sub.email,
                            name: sub.name || '',
                            status: sub.status,
                            source: sub.source,
                            joined_at: sub.subscribedAt ? new Date(sub.subscribedAt).toISOString() : '',
                        });
                        if (batch.length >= BATCH) flush();
                    }
                    flush();
                    controller.close();
                } catch (streamError) {
                    console.error('Export stream error:', streamError);
                    controller.error(streamError);
                }
            },
            async cancel() {
                await cursor.close();
            },
        });

        return new NextResponse(stream, {
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
