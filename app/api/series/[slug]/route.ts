import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Series } from '@/lib/models/Series';
import { Post } from '@/lib/models/Post';
import { User } from '@/lib/models/User';
import { z } from 'zod';
import { AdminAccessError, getOptionalAdminSession, requireAdminSession } from '@/lib/auth/admin';
import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { livePostFilter } from '@/lib/utils/post-visibility';

const optionalHttpUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Enter a valid http or https URL').optional().or(z.literal(''));

const seriesUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).transform(cleanSingleLine).optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(10_000).transform(cleanMultiline).optional(),
  coverImage: optionalHttpUrl,
  published: z.boolean().optional(),
});

/**
 * GET /api/series/[slug]
 * Returns series metadata + all published posts in the series ordered by seriesPart.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    const isAdmin = Boolean(await getOptionalAdminSession());

    const series = await Series.findOne(
      isAdmin ? { slug } : { slug, published: true }
    ).lean();

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const postQuery = isAdmin
      ? { seriesId: series._id, trashedAt: null }
      : { seriesId: series._id, ...livePostFilter() };

    const posts = await Post.find(postQuery)
      .sort({ seriesPart: 1 })
      .populate({ path: 'author', model: User, select: 'name' })
      .lean();

    return NextResponse.json({ series, posts });
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 });
  }
}

/**
 * PATCH /api/series/[slug]  (admin only)
 * Updates series metadata.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdminSession();
    const { slug } = await params;
    const body = await request.json().catch(() => null);
    const data = seriesUpdateSchema.parse(body);

    await connectDB();

    if (data.slug && data.slug !== slug) {
      const duplicate = await Series.exists({ slug: data.slug });
      if (duplicate) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
    }

    const series = await Series.findOneAndUpdate({ slug }, data, { new: true, runValidators: true });
    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    return NextResponse.json(series);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error updating series:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update series' }, { status: 500 });
  }
}

/**
 * DELETE /api/series/[slug]  (admin only)
 * Deletes a series. Posts are NOT deleted — their seriesId is cleared.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdminSession();
    const { slug } = await params;
    await connectDB();

    const series = await Series.findOneAndDelete({ slug });
    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    // Detach posts from the deleted series
    await Post.updateMany(
      { seriesId: series._id },
      { $unset: { seriesId: '', seriesPart: '' } }
    );

    return NextResponse.json({ message: 'Series deleted. Posts detached.' });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error deleting series:', error);
    return NextResponse.json({ error: 'Failed to delete series' }, { status: 500 });
  }
}
