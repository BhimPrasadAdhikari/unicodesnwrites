import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Newsletter from '@/lib/models/Newsletter';
import { sendTestNewsletter } from '@/lib/services/email';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { z } from 'zod';

const testSendSchema = z.object({
    email: z.string().trim().max(254).email().transform((value) => value.toLowerCase()),
});

// POST /api/newsletters/[id]/test
export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAdminSession();
        if (!/^[a-f\d]{24}$/i.test(params.id)) {
            return NextResponse.json({ error: 'Invalid newsletter ID' }, { status: 400 });
        }
        await dbConnect();
        const parsed = testSendSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
        
        const newsletter = await Newsletter.findById(params.id);
        if (!newsletter) return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });

        const { skipped } = await sendTestNewsletter(newsletter, parsed.data.email);
        if (skipped) {
            return NextResponse.json({ error: 'Email is not configured (EMAIL_USER / EMAIL_PASSWORD), so the test was not sent.' }, { status: 503 });
        }

        return NextResponse.json({ message: `Test sent to ${parsed.data.email}` });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        console.error('Test newsletter send failed:', error);
        const detail = error instanceof Error && error.message === 'EMAIL_NOT_CONFIGURED'
            ? 'Email is not configured on the server.'
            : 'The email provider rejected the test send. Check the SMTP credentials and logs.';
        return NextResponse.json({ error: detail }, { status: 502 });
    }
}
