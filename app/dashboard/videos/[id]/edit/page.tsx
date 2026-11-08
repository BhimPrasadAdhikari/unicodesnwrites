import { notFound } from 'next/navigation';
import mongoose from 'mongoose';

import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import VideoSeriesEditor from '@/components/cms/VideoSeriesEditor';
import { connectDB } from '@/lib/db/connection';
import { VideoSeries } from '@/lib/models/VideoSeries';
import { toIstDateTimeLocal } from '@/lib/utils/video-series';

export const metadata = { title: 'Edit video series | Admin Dashboard' };

export default async function EditVideoSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await connectDB();
  const series = await VideoSeries.findById(id).lean();
  if (!series) notFound();

  const initialData = {
    title: series.title,
    slug: series.slug,
    description: series.description || '',
    published: Boolean(series.published),
    featured: Boolean(series.featured),
    parts: (series.parts || []).map((part, index) => ({
      key: part._id ? part._id.toString() : `part-${index}`,
      title: part.title,
      video: part.videoId,
      summary: part.summary || '',
      publishAt: toIstDateTimeLocal(new Date(part.publishAt).toISOString()),
      keywords: (part.keywords || []).join(', '),
    })),
  };

  return (
    <div className="pb-16">
      <DashboardPageHeader eyebrow="Video Series" title={`Edit: ${series.title}`} description="Reorder parts, update links and release times, or change what's published." />
      <VideoSeriesEditor seriesId={id} initialData={initialData} />
    </div>
  );
}
