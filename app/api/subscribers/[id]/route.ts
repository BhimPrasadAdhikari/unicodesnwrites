import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import NewsletterSend from '@/lib/models/NewsletterSend';
import SuppressedEmail, { hashSuppressedEmail } from '@/lib/models/SuppressedEmail';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { sendSubscriberConfirmation } from '@/lib/services/email';
import { recordAdminAction } from '@/lib/services/admin-audit';

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

const subscriberActionSchema = z.object({
    action: z.enum(['unsubscribe', 'resend-confirmation']),
});

// PATCH /api/subscribers/[id] — admin actions that keep the subscriber record
export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAdminSession();
        if (!isObjectId(params.id)) return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 });
        const parsed = subscriberActionSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        await dbConnect();

        const subscriber = await Subscriber.findById(params.id);
        if (!subscriber) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });

        if (parsed.data.action === 'unsubscribe') {
            if (subscriber.status !== 'unsubscribed') {
                subscriber.status = 'unsubscribed';
                subscriber.unsubscribedAt = new Date();
                subscriber.confirmationToken = undefined;
                subscriber.confirmationTokenExpiry = undefined;
                await subscriber.save();
            }
            return NextResponse.json({ message: `${subscriber.email} was unsubscribed.`, status: subscriber.status });
        }

        if (subscriber.status !== 'pending') {
            return NextResponse.json({ error: 'Only pending subscribers can be sent a confirmation email.' }, { status: 400 });
        }
        const token = subscriber.generateConfirmationToken();
        await subscriber.save();
        await sendSubscriberConfirmation(subscriber, token);
        return NextResponse.json({ message: `Confirmation email sent to ${subscriber.email}.`, status: subscriber.status });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Error updating subscriber:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await requireAdminSession();
        if (!isObjectId(params.id)) return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 });
        await dbConnect();

        const subscriber = await Subscriber.findById(params.id).select('email').lean();
        if (!subscriber) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        // Every deleted address is suppressed (written first, so a failure can't leave it
        // unsuppressed) and a later CSV import skips it. Only the person's own
        // double-opt-in clears it.
        const emailHash = hashSuppressedEmail(subscriber.email);
        await SuppressedEmail.updateOne({ emailHash }, { $setOnInsert: { emailHash } }, { upsert: true });
        await Subscriber.deleteOne({ _id: subscriber._id });
        // Queued deliveries go so nothing is sent to a deleted address; past ones stay for
        // campaign reports, with the address blanked.
        await NewsletterSend.deleteMany({ subscriber: subscriber._id, status: { $in: ['pending', 'processing'] } });
        await NewsletterSend.updateMany({ subscriber: subscriber._id }, { $set: { email: '' } });

        await recordAdminAction(session, { action: 'delete', targetType: 'subscribers', targetId: params.id });
        return NextResponse.json({ message: 'Subscriber deleted' }, { status: 200 });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Error deleting subscriber:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
