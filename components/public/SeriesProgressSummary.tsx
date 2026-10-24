'use client';

import { useMemo } from 'react';
import { useReadingProgress } from '@/hooks/useReadingProgress';

interface SeriesProgressSummaryProps {
  postSlugs: string[];
}

export default function SeriesProgressSummary({ postSlugs }: SeriesProgressSummaryProps) {
  const { completedPosts } = useReadingProgress();

  const completedCount = useMemo(() => {
    if (!postSlugs.length) return 0;
    const completedSet = new Set(completedPosts);
    return postSlugs.filter((slug) => completedSet.has(slug)).length;
  }, [completedPosts, postSlugs]);

  const percent = postSlugs.length
    ? Math.round((completedCount / postSlugs.length) * 100)
    : 0;

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-eyebrow text-primary">
            Series progress
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} of {postSlugs.length} parts completed
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background font-mono text-sm text-foreground">
          {percent}%
        </div>
      </div>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
