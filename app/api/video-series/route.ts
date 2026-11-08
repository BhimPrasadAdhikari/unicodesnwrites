import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import { VideoSeries } from '@/lib/models/VideoSeries';
import { videoSeriesSchema } from '@/lib/utils/validations/video-series';

/** POST /api/video-series (admin only): create a video series. */
export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json().catch(() => null);
    const data = videoSeriesSchema.parse(body);

    await connectDB();
    if (await VideoSeries.exists({ slug: data.slug })) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const series = await VideoSeries.create(data);
    return NextResponse.json({ id: series._id.toString(), slug: series.slug }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid video series', issues: error.issues }, { status: 400 });
    }
    console.error('Error creating video series:', error);
    return NextResponse.json({ error: 'Failed to create video series' }, { status: 500 });
  }
}
