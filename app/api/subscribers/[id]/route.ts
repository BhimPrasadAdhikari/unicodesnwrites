import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import NewsletterSend from '@/lib/models/NewsletterSend';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { sendSubscriberConfirmation } from '@/lib/services/email';

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
        await requireAdminSession();
        if (!isObjectId(params.id)) return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 });
        await dbConnect();

        const deleted = await Subscriber.findByIdAndDelete(params.id);
        if (!deleted) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        // Their queued and past deliveries go too, so nothing is sent to a deleted address.
        await NewsletterSend.deleteMany({ subscriber: deleted._id });

        return NextResponse.json({ message: 'Subscriber deleted' }, { status: 200 });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Error deleting subscriber:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
