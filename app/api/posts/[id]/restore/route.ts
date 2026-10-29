import { NextRequest, NextResponse } from 'next/server';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { recordAdminAction } from '@/lib/services/admin-audit';
import { isObjectId } from '@/lib/utils/object-id';

// POST - Take a post out of the trash. It comes back as a draft; publish it again from the editor.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    await connectDB();
    const post = await Post.findOneAndUpdate({ _id: id, trashedAt: { $ne: null } }, { $set: { trashedAt: null } }, { new: true }).select('title');
    if (!post) return NextResponse.json({ error: 'That post is not in the trash.' }, { status: 404 });
    await recordAdminAction(session, { action: 'restore', targetType: 'posts', targetId: id, summary: post.title });
    return NextResponse.json({ message: 'Restored as a draft.' });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Restore post error:', error);
    return NextResponse.json({ error: 'Failed to restore post' }, { status: 500 });
  }
}
