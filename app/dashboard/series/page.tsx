import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/config/auth';
import { connectDB } from '@/lib/db/connection';
import { Series } from '@/lib/models/Series';
import { Post } from '@/lib/models/Post';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import SeriesList from '@/components/cms/SeriesList';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export default async function SeriesPage() {
  await getServerSession(authOptions);
  await connectDB();

  const series = await Series.find().sort({ createdAt: -1 }).lean();
  
  // Part counts for every series in one query
  const counts = await Post.aggregate<{ _id: unknown; count: number }>([
    { $match: { seriesId: { $in: series.map((s) => s._id) } } },
    { $group: { _id: '$seriesId', count: { $sum: 1 } } },
  ]);
  const countBySeries = new Map(counts.map((row) => [String(row._id), row.count]));
  const seriesWithCounts = series.map((s) => ({ ...s, partCount: countBySeries.get(String(s._id)) ?? 0 }));

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Content Series"
        title="Blog Series"
        description="Organize blog posts into structured, multi-part reading series and guided learning tracks."
        action={
          <Link
            href="/dashboard/series/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> New series
          </Link>
        }
      />

      <SeriesList seriesList={JSON.parse(JSON.stringify(seriesWithCounts))} />
    </div>
  );
}
