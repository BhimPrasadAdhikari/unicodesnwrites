import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { consumeRateLimit } from '@/lib/auth/security';
import { authOptions } from '@/lib/config/auth';
import { connectDB } from '@/lib/db/connection';
import Comment from '@/lib/models/Comment';
import { Post } from '@/lib/models/Post';
import { User } from '@/lib/models/User';
import { livePostFilter } from '@/lib/utils/post-visibility';

const schema = z.object({
  postSlug: z.string().min(1).max(200),
  body: z.string().trim().min(2, 'Write a little more.').max(2000, 'Keep it under 2,000 characters.'),
});

/** Signed-in, verified readers can comment; comments wait for approval before they show. */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionValid) {
    return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: 'Verify your email to comment.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid comment' }, { status: 400 });
  }

  const limit = await consumeRateLimit({ scope: 'comment-user', identifier: session.user.id, limit: 10, windowSeconds: 60 * 60 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'You are commenting a lot. Try again in a while.' }, { status: 429 });
  }

  await connectDB();
  const post = await Post.findOne({ slug: parsed.data.postSlug, ...livePostFilter() }).select('_id').lean();
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  const user = await User.findById(session.user.id).select('name role').lean();
  if (!user) return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 });

  await Comment.create({
    post: post._id,
    user: user._id,
    authorName: user.name,
    body: parsed.data.body,
    // The author's own replies need no moderation.
    approved: user.role === 'admin',
  });

  return NextResponse.json(
    { message: user.role === 'admin' ? 'Comment posted.' : 'Thanks! Your comment will appear once it is approved.' },
    { status: 201 },
  );
}
