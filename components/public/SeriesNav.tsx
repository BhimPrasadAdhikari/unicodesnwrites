'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useReadingProgress } from '@/hooks/useReadingProgress';

interface SeriesPart {
  slug: string;
  title: string;
  seriesPart?: number;
}

interface SeriesNavProps {
  seriesTitle: string;
  seriesSlug: string;
  currentPart: number;
  totalParts: number;
  prevPost?: SeriesPart | null;
  nextPost?: SeriesPart | null;
  seriesPostSlugs?: string[];
  currentPostSlug?: string;
}

/**
 * SeriesNav — renders a banner above the article body when the post
 * belongs to a multi-part series. Shows:
 *  - Series name + hub link
 *  - "Part X of Y" indicator
 *  - Previous / Next part links
 */
export default function SeriesNav({
  seriesTitle,
  seriesSlug,
  currentPart,
  totalParts,
  prevPost,
  nextPost,
  seriesPostSlugs = [],
  currentPostSlug,
}: SeriesNavProps) {
  const { completedPosts } = useReadingProgress();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const completedCount = useMemo(() => {
    if (!seriesPostSlugs.length) return 0;
    const completedSet = new Set(completedPosts);
    return seriesPostSlugs.filter((slug) => completedSet.has(slug)).length;
  }, [completedPosts, seriesPostSlugs]);

  const isCurrentCompleted = currentPostSlug
    ? completedPosts.includes(currentPostSlug)
    : false;

  return (
    <div className="mb-10 space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      {/* Series label */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-eyebrow text-primary">
          Blog Series
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <Link
          href={`/blog/series/${seriesSlug}`}
          className="font-serif text-[17px] font-medium text-foreground hover:text-primary transition-colors"
        >
          {seriesTitle}
        </Link>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Part {currentPart} of {totalParts}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(currentPart / totalParts) * 100}%` }}
          />
        </div>
      </div>

      {mounted && seriesPostSlugs.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {completedCount} of {seriesPostSlugs.length} completed
          </span>
          {isCurrentCompleted && (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          )}
        </div>
      )}

      {/* Prev / Next navigation */}
      {(prevPost || nextPost) && (
        <div className="flex items-center gap-3 pt-1">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="group flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-foreground/40"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              <div className="min-w-0">
                <div className="mb-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">PREVIOUS</div>
                <div className="font-medium text-foreground line-clamp-1">{prevPost.title}</div>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="group flex min-h-12 min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border border-border bg-background px-3 py-2 text-right text-xs transition-colors hover:border-foreground/40"
            >
              <div className="min-w-0">
                <div className="mb-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">NEXT</div>
                <div className="font-medium text-foreground line-clamp-1">{nextPost.title}</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
