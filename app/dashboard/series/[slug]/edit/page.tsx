import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import { Series } from '@/lib/models/Series';
import SeriesEditor from '@/components/cms/SeriesEditor';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export default async function EditSeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  await connectDB();
  const series = await Series.findOne({ slug }).lean();

  if (!series) {
    notFound();
  }

  // Convert MongoDB document to plain object
  const seriesData = {
    _id: series._id.toString(),
    title: series.title,
    slug: series.slug,
    description: series.description || '',
    coverImage: series.coverImage || '',
    published: series.published,
  };

  return (
    <div className="pb-16">
      <DashboardPageHeader eyebrow="Content Series" title={`Edit: ${series.title}`} description="Update series metadata, cover image, overview details, and publishing status." />
      <SeriesEditor initialData={seriesData} />
    </div>
  );
}
