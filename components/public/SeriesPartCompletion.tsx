'use client';

import { CheckCircle2 } from 'lucide-react';
import { useReadingProgress } from '@/hooks/useReadingProgress';

interface SeriesPartCompletionProps {
  postSlug: string;
}

export default function SeriesPartCompletion({ postSlug }: SeriesPartCompletionProps) {
  const { completedPosts } = useReadingProgress();
  const isCompleted = completedPosts.includes(postSlug);

  if (!isCompleted) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-success">
      <CheckCircle2 className="h-3 w-3" />
      Completed
    </span>
  );
}
