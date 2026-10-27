import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Newsletter from '@/lib/models/Newsletter';
import NewsletterSend from '@/lib/models/NewsletterSend';
import { updateNewsletterSchema } from '@/lib/utils/validations/newsletter';
import { onlySentFields } from '@/lib/utils/validations/patch';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import newsletterHtmlSanitizer from '@/lib/utils/newsletter-html-sanitizer';
import { htmlToPlainText } from '@/lib/services/newsletter-content';
import { assertCampaignPostsSendable, NewsletterDeliveryError } from '@/lib/services/newsletter-delivery';
import { recordAdminAction } from '@/lib/services/admin-audit';

const { sanitizeNewsletterHtml } = newsletterHtmlSanitizer;

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAdminSession();
        if (!isObjectId(params.id)) return NextResponse.json({ error: 'Invalid newsletter ID' }, { status: 400 });
        await dbConnect();
        const newsletter = await Newsletter.findById(params.id);
        if (!newsletter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(newsletter);
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAdminSession();
        if (!isObjectId(params.id)) return NextResponse.json({ error: 'Invalid newsletter ID' }, { status: 400 });
        await dbConnect();
        const body = await req.json().catch(() => null);
        const result = updateNewsletterSchema.safeParse(body);
        
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const existing = await Newsletter.findById(params.id);
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (['sending', 'paused', 'sent', 'cancelled'].includes(existing.status)) {
            return NextResponse.json(
                {
                    error: existing.status === 'sending' || existing.status === 'paused'
                        ? 'A sending campaign is locked until delivery finishes or is stopped'
                        : 'Sent or stopped campaigns are immutable',
                },
                { status: 409 }
            );
        }

        const updateData: Record<string, unknown> = onlySentFields(result.data, body);

        if (typeof result.data.content === 'string') {
            updateData.content = sanitizeNewsletterHtml(result.data.content);
            updateData.contentPlainText = htmlToPlainText(updateData.content as string);
        }

        if (Object.prototype.hasOwnProperty.call(result.data, 'scheduledFor')) {
            const rawScheduled = result.data.scheduledFor;

            if (rawScheduled) {
                const parsedDate = new Date(rawScheduled);
                if (Number.isNaN(parsedDate.getTime())) {
                    return NextResponse.json({ error: 'Invalid scheduled date' }, { status: 400 });
                }
                updateData.scheduledFor = parsedDate;
            } else {
                updateData.scheduledFor = undefined;
            }
        }

        if (result.data.status === 'scheduled') {
            const scheduledDate = updateData.scheduledFor as Date | undefined;
            if (!scheduledDate) {
                return NextResponse.json({ error: 'scheduledFor is required for scheduled status' }, { status: 400 });
            }

            if (scheduledDate <= new Date()) {
                return NextResponse.json({ error: 'Schedule time must be in the future' }, { status: 400 });
            }

            // Refuse to schedule an article that was already emailed or won't be live by then.
            await assertCampaignPostsSendable(existing, scheduledDate);
        }

        if (result.data.status === 'draft') {
            updateData.scheduledFor = undefined;
            updateData.sentAt = undefined;
            updateData.sentCount = 0;
            updateData.failedCount = 0;
            updateData.recipientCount = 0;
            updateData.deliveryInitializedAt = undefined;
            updateData.deliveryInitializationToken = undefined;
            updateData.deliveryInitializationLeaseExpiresAt = undefined;
        }

        if (result.data.status === 'scheduled') {
            updateData.sentAt = undefined;
            updateData.sentCount = 0;
            updateData.failedCount = 0;
            updateData.recipientCount = 0;
            updateData.deliveryInitializedAt = undefined;
            updateData.deliveryInitializationToken = undefined;
            updateData.deliveryInitializationLeaseExpiresAt = undefined;
        }

        if (result.data.status === 'draft' || result.data.status === 'scheduled') {
            await NewsletterSend.deleteMany({ newsletter: existing._id });
        }
        
        const newsletter = await Newsletter.findByIdAndUpdate(
            params.id,
            { $set: updateData },
            { new: true }
        );
        
        if (!newsletter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(newsletter);
    } catch (error) {
        if (error instanceof AdminAccessError || error instanceof NewsletterDeliveryError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await requireAdminSession();
        if (!isObjectId(params.id)) return NextResponse.json({ error: 'Invalid newsletter ID' }, { status: 400 });
        await dbConnect();
        const existing = await Newsletter.findById(params.id).select('status sentCount').lean();
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (existing.status === 'sending' || existing.status === 'paused') {
            return NextResponse.json({ error: 'Stop this campaign before deleting it' }, { status: 409 });
        }
        // A sent issue is the record of who got what (and stops a post being emailed twice).
        // That holds for a cancelled or failed campaign that reached anyone, too.
        if (existing.status === 'sent' || (existing.sentCount ?? 0) > 0) {
            return NextResponse.json({ error: 'Sent issues are kept as a delivery record and cannot be deleted.' }, { status: 409 });
        }
        const newsletter = await Newsletter.findByIdAndDelete(params.id);
         if (!newsletter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        await NewsletterSend.deleteMany({ newsletter: newsletter._id });
        await recordAdminAction(session, { action: 'delete', targetType: 'newsletters', targetId: params.id, summary: newsletter.subject });
        return NextResponse.json({ message: 'Deleted' });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
