import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import { validateUnsubscribeToken } from '@/lib/utils/email-tokens';
import { sendUnsubscribeConfirmation } from '@/lib/services/email';
import { unsubscribeSchema } from '@/lib/utils/validations/newsletter';

// Mail clients implementing RFC 8058 one-click unsubscribe POST a form body
// ("List-Unsubscribe=One-Click") to the URL from the List-Unsubscribe header,
// so the signed email/token pair arrives in the query string instead of JSON.
const readUnsubscribeInput = async (req: NextRequest) => {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return req.json();
    const params = req.nextUrl.searchParams;
    return { email: params.get('email'), token: params.get('token') };
};

export async function POST(req: NextRequest) {
    try {
        const validation = unsubscribeSchema.safeParse(await readUnsubscribeInput(req));
        if (!validation.success) return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
        const { email, token } = validation.data;

        if (!validateUnsubscribeToken(email, token)) return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 });

        await dbConnect();
        
        const subscriber = await Subscriber.findOne({ email });
        
        if (!subscriber) {
             // If user doesn't exist, we can just say success to avoid enumeration, or error.
             // For unsubscribe, usually better to say "Unsubscribed" even if already gone.
             return NextResponse.json({ message: 'Unsubscribed successfully' });
        }

        if (subscriber.status === 'unsubscribed') {
            return NextResponse.json({ message: 'Already unsubscribed' });
        }

        subscriber.status = 'unsubscribed';
        subscriber.unsubscribedAt = new Date();
        subscriber.welcomeNextAt = null; // a later re-subscribe starts clean, not mid-series
        await subscriber.save();

        // Send confirmation (optional, but good UX)
        try {
            await sendUnsubscribeConfirmation(subscriber);
        } catch (e) {
            console.error('Failed to send unsubscribe confirmation', e);
        }

        return NextResponse.json({ message: 'Unsubscribed successfully' });

    } catch (error) {
        if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        console.error('Unsubscribe error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
