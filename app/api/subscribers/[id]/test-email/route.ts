import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import { sendEmail } from '@/lib/services/email';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAdminSession();
        await dbConnect();
        const { id } = params;
        const subscriber = await Subscriber.findById(id);
        
        if (!subscriber) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        await sendEmail({
            to: subscriber.email,
            subject: 'Test Email from unicodesnwrites',
            html: '<p>This is a test email sent from the admin dashboard.</p>',
            text: 'This is a test email sent from the admin dashboard.',
        });

        return NextResponse.json({ message: 'Test email sent' });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Error sending test email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
