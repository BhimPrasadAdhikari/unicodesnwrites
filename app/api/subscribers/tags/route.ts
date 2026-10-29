import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { countCampaignAudience, countSubscriberTags } from '@/lib/services/subscriber-tags';
import { MAX_SUBSCRIBER_TAGS, parseTagFilter } from '@/lib/utils/validations/subscriber';

// GET /api/subscribers/tags — tags in use with their counts, plus how many confirmed
// subscribers a campaign would reach. `?audience=a,b` counts those carrying any of the tags.
export async function GET(req: NextRequest) {
    try {
        await requireAdminSession();
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const audience = [...new Set(
            (searchParams.get('audience') || '')
                .split(',')
                .map((tag) => parseTagFilter(tag))
                .filter(Boolean)
        )].slice(0, MAX_SUBSCRIBER_TAGS);

        const [tags, everyone, audienceCount] = await Promise.all([
            countSubscriberTags(),
            countCampaignAudience(),
            audience.length ? countCampaignAudience(audience) : null,
        ]);

        return NextResponse.json({
            everyone,
            tags,
            ...(audienceCount === null ? {} : { audience: { tags: audience, count: audienceCount } }),
        });
    } catch (error) {
        if (error instanceof AdminAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        console.error('Subscriber tag count error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
