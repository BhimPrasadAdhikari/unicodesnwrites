import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { postSchema } from '@/lib/utils/validations/post';
import { calculateReadingTime } from '@/lib/utils/slug';
import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import Comment from '@/lib/models/Comment';
import { recordAdminAction } from '@/lib/services/admin-audit';

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

// GET - Single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    await connectDB();
    const post = await Post.findById(id).populate('author', 'name email');

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PATCH - Update post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    const body = await request.json().catch(() => null);
    const validatedData = postSchema.parse(body);

    await connectDB();

    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post.trashedAt) {
      return NextResponse.json({ error: 'This post is in the trash. Restore it before editing.' }, { status: 409 });
    }

    // If slug changed, check if new slug exists
    if (validatedData.slug !== post.slug) {
      const existingPost = await Post.findOne({ slug: validatedData.slug });
      if (existingPost) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(validatedData.content);

    // An explicit date wins (a future one schedules the post); otherwise stamp
    // the first publish with "now" and keep the existing date afterwards.
    const publishedAt = validatedData.publishedAt
      ? new Date(validatedData.publishedAt)
      : validatedData.published && !post.published
        ? new Date()
        : post.publishedAt;

    // Build update: series fields need special handling
    const { seriesId, seriesPart, publishedAt: _requestedPublishedAt, ...coreData } = validatedData;
    void _requestedPublishedAt;

    // Build $set and optional $unset for series fields
    const updateSet: Record<string, unknown> = {
      ...coreData,
      readingTime,
      publishedAt,
      updatedAt: new Date(),
    };
    const updateUnset: Record<string, string> = {};

    if (seriesId && seriesId.trim() !== '') {
      updateSet.seriesId = new (await import('mongoose')).default.Types.ObjectId(seriesId);
      if (seriesPart !== undefined) {
        updateSet.seriesPart = seriesPart;
      }
    } else {
      // Clear series linkage
      updateUnset.seriesId = '';
      updateUnset.seriesPart = '';
    }

    const updateOp: Record<string, unknown> = { $set: updateSet };
    if (Object.keys(updateUnset).length > 0) {
      updateOp.$unset = updateUnset;
    }

    const updatedPost = await Post.findByIdAndUpdate(id, updateOp, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error updating post:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE - Move a post to the trash, or (?permanent=1, trashed posts only) delete it for good
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    const permanent = request.nextUrl.searchParams.get('permanent') === '1';
    await connectDB();

    if (!permanent) {
      // Unpublishing hides it everywhere readers look; restoring brings it back as a draft.
      const trashed = await Post.findOneAndUpdate(
        { _id: id, trashedAt: null },
        { $set: { trashedAt: new Date(), published: false } },
        { new: true },
      ).select('title');
      if (!trashed) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      await recordAdminAction(session, { action: 'trash', targetType: 'posts', targetId: id, summary: trashed.title });
      return NextResponse.json({ message: 'Moved to trash. Restore it from the Trash tab within 30 days.' });
    }

    const post = await Post.findOneAndDelete({ _id: id, trashedAt: { $ne: null } });
    if (!post) {
      return NextResponse.json({ error: 'Only posts in the trash can be deleted for good.' }, { status: 409 });
    }
    // Its comments would otherwise sit in the moderation queue under "a deleted post".
    await Comment.deleteMany({ post: post._id });

    await recordAdminAction(session, { action: 'delete', targetType: 'posts', targetId: id, summary: post.title });
    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
