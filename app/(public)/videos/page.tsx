import type { Metadata } from 'next';

import { VideoSeriesTeaser } from '@/components/public/VideoSeries';
import { Container } from '@/components/ui/Section';
import { listPublishedVideoSeries } from '@/lib/services/video-series';
import { releasedParts } from '@/lib/utils/video-series';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Videos',
  alternates: { canonical: '/videos' },
  description: 'Video series that explain how AI works, one part at a time.',
};

export default async function VideosPage() {
  const now = new Date();
  const seriesList = (await listPublishedVideoSeries()).filter((series) => releasedParts(series, now).length > 0);

  return (
    <div className="pb-24">
      <section className="border-b border-border py-14 sm:py-20">
        <Container className="max-w-[1200px]">
          <p className="text-eyebrow text-primary">Videos</p>
          <h1 className="mt-3 text-title">Watch how AI works.</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
            Video series that take one topic apart, a part at a time. Start at part one and watch in order.
          </p>
        </Container>
      </section>
      <Container className="max-w-[1200px] space-y-8 py-12 sm:py-16">
        {seriesList.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No video series yet. Check back soon.</p>
        ) : (
          seriesList.map((series) => <VideoSeriesTeaser key={series.id} series={series} now={now} />)
        )}
      </Container>
    </div>
  );
}
