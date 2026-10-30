import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { siteIconFor } from '@/components/ui/SiteIcon';

interface SeriesCardProps {
  series: {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    coverImage?: string;
    partCount: number;
    latestPublishedAt: string | Date;
  };
}

/**
 * SeriesCard — one card for a whole blog series in the listing, linking to the series hub
 * at /blog/series/[slug] instead of showing every part.
 */
export default function SeriesCard({ series }: SeriesCardProps) {
  const latestDate = series.latestPublishedAt ? new Date(series.latestPublishedAt) : new Date();
  const parts = `${series.partCount} ${series.partCount === 1 ? 'PART' : 'PARTS'}`;

  return (
    <Link href={`/blog/series/${series.slug}`} className="group block">
      <article className="grid overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/40 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="relative aspect-[16/9] border-b border-border sm:aspect-auto sm:min-h-[180px] sm:border-b-0 sm:border-r">
          {series.coverImage ? (
            <Image src={series.coverImage} alt="" fill sizes="(min-width: 640px) 200px, 100vw" className="object-cover" />
          ) : (
            <CoverPlaceholder kind={siteIconFor(`${series.title} ${series.description ?? ''}`)} label={`SERIES · ${parts}`} iconSize={64} />
          )}
        </div>
        <div className="flex flex-col gap-2.5 p-5 sm:p-6">
          <p className="font-mono text-[12px] tracking-[0.06em] text-primary">SERIES · {parts}</p>
          <h2 className="font-serif text-[22px] font-medium leading-[1.2] tracking-[-0.01em] text-foreground group-hover:text-primary sm:text-2xl">
            {series.title}
          </h2>
          {series.description ? (
            <p className="line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">{series.description}</p>
          ) : null}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-[13px]">
            <span className="font-medium underline decoration-primary decoration-2 underline-offset-4">Read the series</span>
            <span className="text-muted-foreground">Updated {format(latestDate, 'd MMM yyyy')}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
