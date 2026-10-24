import { NextRequest, NextResponse } from 'next/server';
import type { Types } from 'mongoose';
import dbConnect from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { generateArticleSummary, type ArticleSummary } from '@/lib/services/article-summary';
import { livePostFilter } from '@/lib/utils/post-visibility';
import { consumeRateLimit, getClientAddress } from '@/lib/auth/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const slug = body?.slug;

    if (!slug || typeof slug !== 'string' || slug.length > 200) {
      return NextResponse.json({ error: 'Post slug is required.' }, { status: 400 });
    }

    await dbConnect();
    const post = await Post.findOne({ slug, ...livePostFilter() })
      .select('title content updatedAt +aiSummary +aiSummaryAt')
      .lean<{ _id: Types.ObjectId; title: string; content: string; updatedAt?: Date; aiSummary?: ArticleSummary; aiSummaryAt?: Date }>();
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // One generation per post revision; every reader after the first gets the stored copy.
    const revision = post.updatedAt ? new Date(post.updatedAt).getTime() : 0;
    if (post.aiSummary && post.aiSummaryAt && new Date(post.aiSummaryAt).getTime() === revision) {
      return NextResponse.json(post.aiSummary);
    }

    const limit = await consumeRateLimit({
      scope: 'article-summary-ip',
      identifier: getClientAddress(request),
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many summary requests. Try again later.' }, { status: 429 });
    }

    const summary = await generateArticleSummary(post.title, post.content);
    // timestamps:false keeps updatedAt (and so the cache key) unchanged.
    await Post.updateOne(
      { _id: post._id },
      { $set: { aiSummary: summary, aiSummaryAt: post.updatedAt ?? new Date(0) } },
      { timestamps: false },
    );
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Article summary API error:', error);
    return NextResponse.json({ error: 'Unable to generate AI summary.' }, { status: 502 });
  }
}
