import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { cancelNewsletterDelivery, NewsletterDeliveryError } from '@/lib/services/newsletter-delivery';

export async function POST(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAdminSession();
        if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid newsletter ID' }, { status: 400 });
        const result = await cancelNewsletterDelivery(params.id);
        return NextResponse.json({ message: 'Campaign stopped. Pending recipients will not be emailed.', ...result });
    } catch (error) {
        if (error instanceof AdminAccessError || error instanceof NewsletterDeliveryError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        console.error('Cancel campaign error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
