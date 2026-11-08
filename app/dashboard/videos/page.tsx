import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import VideoSeriesList, { type VideoSeriesRow } from '@/components/cms/VideoSeriesList';
import { connectDB } from '@/lib/db/connection';
import { VideoSeries } from '@/lib/models/VideoSeries';
import { toVideoSeriesView } from '@/lib/services/video-series';
import { formatPartReleaseDate, isPartReleased } from '@/lib/utils/video-series';

export const metadata = { title: 'Video series | Admin Dashboard' };

export default async function VideoSeriesDashboardPage() {
  await connectDB();
  const docs = await VideoSeries.find().sort({ createdAt: -1 }).lean();
  const now = new Date();

  const rows: VideoSeriesRow[] = docs.map((doc) => {
    const view = toVideoSeriesView(doc);
    const upcoming = view.parts.filter((part) => !isPartReleased(part, now));
    const next = upcoming.sort((a, b) => a.publishAt.localeCompare(b.publishAt))[0];
    return {
      id: view.id,
      title: view.title,
      slug: view.slug,
      published: Boolean(doc.published),
      featured: view.featured,
      partCount: view.parts.length,
      releasedCount: view.parts.length - upcoming.length,
      nextRelease: next ? `Part ${next.part}, ${formatPartReleaseDate(next)}` : null,
    };
  });

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Video Series"
        title="Video series"
        description="YouTube series shown at /videos. Scheduled parts appear as “coming” and switch to an embed on their release time."
        action={
          <Link
            href="/dashboard/videos/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" /> New video series
          </Link>
        }
      />
      <VideoSeriesList rows={rows} />
    </div>
  );
}
