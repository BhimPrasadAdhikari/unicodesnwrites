import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Newsletter from '@/lib/models/Newsletter';
import {
    NewsletterDeliveryError,
    startOrContinueNewsletterDelivery,
} from '@/lib/services/newsletter-delivery';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAdminSession();
        await dbConnect();

        const newsletter = await Newsletter.findById(params.id);
        if (!newsletter) {
            return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
        }

        const batchSizeParam = req.nextUrl.searchParams.get('batchSize');
        const forceParam = req.nextUrl.searchParams.get('force');
        const retryFailedParam = req.nextUrl.searchParams.get('retryFailed');

        const parsedBatchSize = batchSizeParam ? Number(batchSizeParam) : undefined;
        const batchSize = Number.isFinite(parsedBatchSize) ? parsedBatchSize : undefined;
        const forceScheduledStart = forceParam === '1' || forceParam === 'true';
        const retryFailed = retryFailedParam === '1' || retryFailedParam === 'true';

        if (newsletter.status === 'scheduled' && !forceScheduledStart) {
            if (!newsletter.scheduledFor || newsletter.scheduledFor > new Date()) {
                return NextResponse.json(
                    {
                        error:
                            'Newsletter is scheduled for the future. Use scheduler or force send when ready.',
                    },
                    { status: 400 }
                );
            }
        }

        if (newsletter.status === 'sent' && !retryFailed) {
            return NextResponse.json({ error: 'Newsletter already sent' }, { status: 400 });
        }

        const result = await startOrContinueNewsletterDelivery(params.id, {
            batchSize,
            allowScheduledStart: newsletter.status === 'scheduled' || forceScheduledStart,
            retryFailed,
            // An admin clicking send is an explicit request to try again now.
            resumePaused: true,
        });

        const responseStatus = result.pendingCount > 0 ? 202 : 200;
        const pendingMessage = result.status === 'paused'
            ? 'Sending paused by the email provider. The scheduler resumes it automatically.'
            : 'Batch processed. Continue processing until pending reaches zero.';
        return NextResponse.json(
            {
                message:
                    result.pendingCount > 0 ? pendingMessage : 'Newsletter send completed.',
                ...result,
            },
            { status: responseStatus }
        );
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        if (error instanceof NewsletterDeliveryError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Broadcast error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
