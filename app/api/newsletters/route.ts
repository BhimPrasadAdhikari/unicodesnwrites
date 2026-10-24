import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Newsletter from '@/lib/models/Newsletter';
import { createNewsletterSchema } from '@/lib/utils/validations/newsletter';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import newsletterHtmlSanitizer from '@/lib/utils/newsletter-html-sanitizer';
import { htmlToPlainText } from '@/lib/services/newsletter-content';

const { sanitizeNewsletterHtml } = newsletterHtmlSanitizer;

export async function POST(req: NextRequest) {
    try {
        const session = await requireAdminSession();
        await dbConnect();
        
        const body = await req.json().catch(() => null);
        const result = createNewsletterSchema.safeParse(body);
        
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
        }
        
        const newsletterData = {
            ...result.data,
            content: sanitizeNewsletterHtml(result.data.content),
            scheduledFor: result.data.scheduledFor ? new Date(result.data.scheduledFor) : undefined,
            author: session.user.id,
            status: 'draft' as const,
        };

        const newsletter = await Newsletter.create({
            ...newsletterData,
            contentPlainText: htmlToPlainText(newsletterData.content),
        });
        
        return NextResponse.json(newsletter, { status: 201 });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Create newsletter error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
