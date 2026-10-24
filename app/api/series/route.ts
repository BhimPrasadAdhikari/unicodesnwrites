import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Series } from '@/lib/models/Series';
import { Post } from '@/lib/models/Post';
import { z } from 'zod';
import { AdminAccessError, getOptionalAdminSession, requireAdminSession } from '@/lib/auth/admin';
import { cleanMultiline, cleanSingleLine } from '@/lib/utils/sanitize';
import { livePostFilter } from '@/lib/utils/post-visibility';

const optionalHttpUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Enter a valid http or https URL').optional().or(z.literal(''));

const seriesSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120).transform(cleanSingleLine),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  description: z.string().trim().max(10_000).transform(cleanMultiline).optional(),
  coverImage: optionalHttpUrl,
  published: z.boolean().default(false),
});

/**
 * GET /api/series
 * Returns all published series (public) or all series (admin).
 * Each series document is augmented with:
 *  - partCount: number of published posts in the series
 *  - latestPublishedAt: publishedAt of the most recently published part
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const isAdmin = Boolean(await getOptionalAdminSession());

    const query = isAdmin ? {} : { published: true };
    const seriesList = await Series.find(query).sort({ createdAt: -1 }).lean();

    // Augment each series with aggregate post data
    const augmented = await Promise.all(
      seriesList.map(async (s) => {
        const postQuery = isAdmin
          ? { seriesId: s._id }
          : { seriesId: s._id, ...livePostFilter() };

        const [partCount, latestPost] = await Promise.all([
          Post.countDocuments(postQuery),
          Post.findOne(postQuery)
            .sort({ publishedAt: -1 })
            .select('publishedAt')
            .lean(),
        ]);

        return {
          ...s,
          partCount,
          latestPublishedAt: latestPost?.publishedAt ?? s.createdAt,
        };
      })
    );

    return NextResponse.json({ series: augmented });
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 });
  }
}

/**
 * POST /api/series  (admin only)
 * Creates a new series.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json().catch(() => null);
    const data = seriesSchema.parse(body);

    await connectDB();

    const existing = await Series.findOne({ slug: data.slug });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const series = await Series.create(data);
    return NextResponse.json(series, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Error creating series:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create series' }, { status: 500 });
  }
}
