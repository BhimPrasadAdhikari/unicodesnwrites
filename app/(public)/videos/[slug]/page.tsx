import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { VideoPartList } from '@/components/public/VideoSeries';
import { Container } from '@/components/ui/Section';
import { getPublishedVideoSeries } from '@/lib/services/video-series';
import { releasedParts, videoSeriesPath, youtubeWatchUrl } from '@/lib/utils/video-series';

// Read on every request so edits and scheduled releases show up immediately.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const series = await getPublishedVideoSeries(slug).catch(() => null);
  if (!series) return { title: 'Video series not found' };
  return {
    title: `${series.title} video series`,
    description: series.description || `Every part of the ${series.title} video series, in order.`,
    alternates: { canonical: videoSeriesPath(series.slug) },
  };
}

export default async function VideoSeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const series = await getPublishedVideoSeries(slug);
  if (!series) notFound();

  const now = new Date();
  const released = releasedParts(series, now);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${series.title} video series`,
    numberOfItems: released.length,
    itemListElement: released.map((part, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: youtubeWatchUrl(part.videoId),
      name: `Part ${part.part}: ${part.title}`,
    })),
  };

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <section className="border-b border-border py-14 sm:py-20">
        <Container className="max-w-[1200px]">
          <Link href="/videos" className="text-eyebrow text-primary hover:underline">Video series</Link>
          <h1 className="mt-3 text-title">{series.title}</h1>
          {series.description && (
            <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">{series.description}</p>
          )}
          <p className="mt-6 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
            {released.length} OF {series.parts.length} PARTS OUT · WATCH IN ORDER
          </p>
        </Container>
      </section>
      <Container className="max-w-[1200px] py-12 sm:py-16">
        <VideoPartList series={series} now={now} />
      </Container>
    </div>
  );
}
