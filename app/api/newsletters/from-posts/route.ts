import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/db/connection';
import Newsletter from '@/lib/models/Newsletter';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { objectIdSchema } from '@/lib/utils/validations/common';
import newsletterHtmlSanitizer from '@/lib/utils/newsletter-html-sanitizer';
import {
    buildArticleNewsletter,
    buildDigestNewsletter,
    findCommittedCampaignsForPosts,
    findDigestCandidates,
    htmlToPlainText,
    loadPostsForNewsletter,
} from '@/lib/services/newsletter-content';

const { sanitizeNewsletterHtml } = newsletterHtmlSanitizer;

const fromPostsSchema = z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('article'), postId: objectIdSchema }),
    z.object({ mode: z.literal('digest'), postIds: z.array(objectIdSchema).min(1).max(10).optional() }),
]);

const errorResponse = (error: unknown) => {
    if (error instanceof AdminAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Newsletter from posts error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
};

// GET /api/newsletters/from-posts — articles that would go into the next digest
export async function GET() {
    try {
        await requireAdminSession();
        await dbConnect();
        const { since, posts } = await findDigestCandidates();
        return NextResponse.json({
            since: since.toISOString(),
            posts: posts.map((post) => ({
                _id: post._id.toString(),
                title: post.title,
                slug: post.slug,
                publishedAt: post.publishedAt?.toISOString(),
            })),
        });
    } catch (error) {
        return errorResponse(error);
    }
}

// POST /api/newsletters/from-posts — create a draft campaign from one article or a digest
export async function POST(req: NextRequest) {
    try {
        const session = await requireAdminSession();
        const parsed = fromPostsSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }
        await dbConnect();

        const input = parsed.data;
        const postIds = input.mode === 'article'
            ? [new mongoose.Types.ObjectId(input.postId)]
            : input.postIds
                ? input.postIds.map((id) => new mongoose.Types.ObjectId(id))
                : (await findDigestCandidates()).posts.map((post) => post._id);

        if (!postIds.length) {
            return NextResponse.json(
                { error: 'There are no new published articles that have not already been emailed.' },
                { status: 400 }
            );
        }

        const posts = await loadPostsForNewsletter(postIds);
        if (posts.length !== postIds.length) {
            return NextResponse.json({ error: 'One or more articles could not be found.' }, { status: 404 });
        }
        const unpublished = posts.find((post) => !post.published);
        if (unpublished) {
            return NextResponse.json(
                { error: `"${unpublished.title}" is still a draft. Publish it before emailing subscribers.` },
                { status: 400 }
            );
        }

        const committed = await findCommittedCampaignsForPosts(postIds);
        if (committed.size) {
            const [postId, campaign] = committed.entries().next().value!;
            const post = posts.find((candidate) => candidate._id.toString() === postId);
            return NextResponse.json(
                {
                    error: `"${post?.title ?? 'This article'}" is already in campaign "${campaign.subject}" (${campaign.status}).`,
                    newsletterId: campaign.newsletterId,
                },
                { status: 409 }
            );
        }

        if (input.mode === 'article') {
            // Reuse an existing draft for this article instead of piling up duplicates.
            const existingDraft = await Newsletter.findOne({ kind: 'article', posts: postIds[0], status: { $in: ['draft', 'failed'] } })
                .select('_id')
                .lean();
            if (existingDraft) {
                return NextResponse.json({ _id: existingDraft._id.toString(), reused: true });
            }
        }

        const built = input.mode === 'article' ? buildArticleNewsletter(posts[0]) : buildDigestNewsletter(posts);
        const content = sanitizeNewsletterHtml(built.content);
        const newsletter = await Newsletter.create({
            ...built,
            content,
            contentPlainText: htmlToPlainText(content),
            template: input.mode === 'digest' ? 'digest' : 'simple',
            kind: input.mode,
            posts: postIds,
            author: session.user.id,
            status: 'draft',
        });

        return NextResponse.json({ _id: newsletter._id.toString(), reused: false }, { status: 201 });
    } catch (error) {
        return errorResponse(error);
    }
}
