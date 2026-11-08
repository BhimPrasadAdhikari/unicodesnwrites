import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarClock } from 'lucide-react';

import { LiteYouTube } from '@/components/public/LiteYouTube';
import {
  formatPartReleaseDate,
  isPartReleased,
  releasedParts,
  videoSeriesPath,
  youtubeWatchUrl,
  type VideoPartView,
  type VideoSeriesView,
} from '@/lib/utils/video-series';

/** Every part in order: released parts embedded, upcoming parts dated. */
export function VideoPartList({ series, now = new Date() }: { series: VideoSeriesView; now?: Date }) {
  return (
    <ol className="grid gap-x-8 gap-y-12 md:grid-cols-2">
      {series.parts.map((part) =>
        isPartReleased(part, now) ? (
          <li key={`${part.part}-${part.videoId}`} className="flex flex-col gap-4">
            <LiteYouTube videoId={part.videoId} title={`Part ${part.part}: ${part.title}`} />
            <div>
              <p className="text-eyebrow text-primary">Part {part.part}</p>
              <h2 className="mt-1 font-serif text-2xl font-medium tracking-[-0.02em]">{part.title}</h2>
              {part.summary && <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">{part.summary}</p>}
              <a
                href={youtubeWatchUrl(part.videoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Watch on YouTube <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </li>
        ) : (
          <li
            key={`${part.part}-${part.videoId}`}
            className="flex flex-col justify-center rounded-2xl border border-dashed border-border p-6"
          >
            <p className="text-eyebrow text-muted-foreground">Part {part.part}</p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-[-0.02em]">{part.title}</h2>
            {part.summary && <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">{part.summary}</p>}
            <p className="mt-4 inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.06em] text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" /> COMING {formatPartReleaseDate(part).toUpperCase()}
            </p>
          </li>
        ),
      )}
    </ol>
  );
}

/** Card for one series: description, progress and its latest released part. */
export function VideoSeriesTeaser({ series, now = new Date() }: { series: VideoSeriesView; now?: Date }) {
  const released = releasedParts(series, now);
  const latest = released[released.length - 1];
  if (!latest) return null;

  return (
    <section className="grid items-center gap-8 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="text-eyebrow text-primary">Video series</p>
        <h2 className="mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em]">{series.title}</h2>
        {series.description && <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">{series.description}</p>}
        <p className="mt-4 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
          {released.length} OF {series.parts.length} PARTS OUT
        </p>
        <Link
          href={videoSeriesPath(series.slug)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Watch the series <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div>
        <LiteYouTube videoId={latest.videoId} title={`Part ${latest.part}: ${latest.title}`} />
        <p className="mt-2 text-sm text-muted-foreground">
          Latest: Part {latest.part}, {latest.title}
        </p>
      </div>
    </section>
  );
}

/** Teasers for every featured series that has at least one released part. */
export function FeaturedVideoSeries({ seriesList, now = new Date() }: { seriesList: VideoSeriesView[]; now?: Date }) {
  const featured = seriesList.filter((series) => series.featured && releasedParts(series, now).length > 0);
  if (featured.length === 0) return null;
  return (
    <div className="space-y-8">
      {featured.map((series) => (
        <VideoSeriesTeaser key={series.id} series={series} now={now} />
      ))}
    </div>
  );
}

/** One part embedded under a related article. */
export function VideoPartEmbed({ series, part }: { series: VideoSeriesView; part: VideoPartView }) {
  return (
    <aside className="my-12 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <p className="text-eyebrow text-primary">Watch the video</p>
      <h2 className="mt-2 font-serif text-2xl font-medium tracking-[-0.02em]">
        {series.title}, Part {part.part}: {part.title}
      </h2>
      {part.summary && <p className="mt-1 text-[15px] leading-[1.6] text-muted-foreground">{part.summary}</p>}
      <LiteYouTube className="mt-4" videoId={part.videoId} title={`Part ${part.part}: ${part.title}`} />
      <Link
        href={videoSeriesPath(series.slug)}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        See every part of the series <ArrowRight className="h-4 w-4" />
      </Link>
    </aside>
  );
}
