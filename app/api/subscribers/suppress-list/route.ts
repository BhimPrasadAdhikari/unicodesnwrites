import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { recordAdminAction } from '@/lib/services/admin-audit';
import { parseEmailList, suppressSubscriberEmails } from '@/lib/services/ses-bounce-sync';
import { BOUNCED_TAG } from '@/lib/utils/validations/subscriber';

const MAX_BYTES = 1024 * 1024;
const MAX_EMAILS = 5_000;

/**
 * Marks uploaded addresses as bounced: matching subscribers are unsubscribed and
 * tagged "bounced". Used to reconcile the SES account suppression list, which
 * already blocks these addresses at the provider.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAdminSession();

        const formData = await req.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'File is larger than 1 MB. Split it and upload in parts.' }, { status: 413 });
        }

        const { emails, invalid } = parseEmailList(await file.text());
        if (!emails.length) {
            return NextResponse.json({ error: 'No email addresses found in the file.' }, { status: 400 });
        }
        if (emails.length > MAX_EMAILS) {
            return NextResponse.json({ error: `The file lists more than ${MAX_EMAILS.toLocaleString()} addresses. Split it and upload in parts.` }, { status: 413 });
        }

        await dbConnect();
        const { matched, updated } = await suppressSubscriberEmails(emails, BOUNCED_TAG);
        const notFound = emails.length - matched;

        await recordAdminAction(session, { action: 'mark-bounced', targetType: 'subscribers', summary: `listed ${emails.length}, matched ${matched}, updated ${updated}, not found ${notFound}, invalid ${invalid}` });
        return NextResponse.json({ matched, updated, notFound, invalid });

    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Suppress list API error:', error instanceof Error ? error.message : 'unknown error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
