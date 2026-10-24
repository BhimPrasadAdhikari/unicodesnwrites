import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import { Post, IPost } from '@/lib/models/Post';
import { generateArticleSummary } from '@/lib/services/article-summary';
import { livePostFilter } from '@/lib/utils/post-visibility';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const slug = body?.slug;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Post slug is required.' }, { status: 400 });
    }

    await dbConnect();
    const post = (await Post.findOne({ slug, ...livePostFilter() }).lean()) as unknown as IPost;
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const summary = await generateArticleSummary(post.title, post.content);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Article summary API error:', error);
    return NextResponse.json({ error: 'Unable to generate AI summary.' }, { status: 502 });
  }
}
