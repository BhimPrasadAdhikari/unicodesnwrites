import { connectDB } from '@/lib/db/connection';
import { VideoSeries, type IVideoSeries } from '@/lib/models/VideoSeries';
import type { VideoSeriesView } from '@/lib/utils/video-series';

type LeanVideoSeries = Pick<IVideoSeries, '_id' | 'slug' | 'title' | 'description' | 'featured' | 'parts'>;

export function toVideoSeriesView(doc: LeanVideoSeries): VideoSeriesView {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description || '',
    featured: Boolean(doc.featured),
    parts: (doc.parts || []).map((part, index) => ({
      part: index + 1,
      title: part.title,
      videoId: part.videoId,
      summary: part.summary || '',
      publishAt: new Date(part.publishAt).toISOString(),
      keywords: part.keywords || [],
    })),
  };
}

/** All published series, newest first. Returns [] if the database is unavailable. */
export async function listPublishedVideoSeries(): Promise<VideoSeriesView[]> {
  try {
    await connectDB();
    const docs = await VideoSeries.find({ published: true }).sort({ createdAt: -1 }).lean<LeanVideoSeries[]>();
    return docs.map(toVideoSeriesView);
  } catch (error) {
    console.error('Video series could not be loaded:', error instanceof Error ? error.message : 'unknown error');
    return [];
  }
}

export async function getPublishedVideoSeries(slug: string): Promise<VideoSeriesView | null> {
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  await connectDB();
  const doc = await VideoSeries.findOne({ slug, published: true }).lean<LeanVideoSeries>();
  return doc ? toVideoSeriesView(doc) : null;
}
