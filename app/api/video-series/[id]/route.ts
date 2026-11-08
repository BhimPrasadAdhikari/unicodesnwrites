import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import { VideoSeries } from '@/lib/models/VideoSeries';
import { videoSeriesSchema } from '@/lib/utils/validations/video-series';

type Params = { params: Promise<{ id: string }> };

const invalidId = () => NextResponse.json({ error: 'Video series not found' }, { status: 404 });

/** PUT /api/video-series/[id] (admin only): replace a series, parts included. */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return invalidId();

    const body = await request.json().catch(() => null);
    const data = videoSeriesSchema.parse(body);

    await connectDB();
    if (await VideoSeries.exists({ slug: data.slug, _id: { $ne: id } })) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const series = await VideoSeries.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!series) return invalidId();
    return NextResponse.json({ id: series._id.toString(), slug: series.slug });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid video series', issues: error.issues }, { status: 400 });
    }
    console.error('Error updating video series:', error);
    return NextResponse.json({ error: 'Failed to update video series' }, { status: 500 });
  }
}

/** DELETE /api/video-series/[id] (admin only). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return invalidId();

    await connectDB();
    const series = await VideoSeries.findByIdAndDelete(id);
    if (!series) return invalidId();
    return NextResponse.json({ message: 'Video series deleted.' });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error deleting video series:', error);
    return NextResponse.json({ error: 'Failed to delete video series' }, { status: 500 });
  }
}
