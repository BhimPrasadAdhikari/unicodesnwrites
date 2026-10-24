'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useReadingProgress } from '@/hooks/useReadingProgress';

interface BlogReadingProgressProps {
  postSlug: string;
  readingTime?: number;
}

const calculateScrollProgress = () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  if (total <= 0) return 100;
  const raw = (window.scrollY / total) * 100;
  return Math.min(100, Math.max(0, raw));
};

export default function BlogReadingProgress({
  postSlug,
  readingTime = 0,
}: BlogReadingProgressProps) {
  const { completedPosts, setPostCompletion } = useReadingProgress();
  const isCompleted = completedPosts.includes(postSlug);
  const [progress, setProgress] = useState(0);
  const [autoMarked, setAutoMarked] = useState(false);

  const autoCompleteDelay = useMemo(() => {
    if (readingTime >= 10) return 25000;
    if (readingTime >= 5) return 20000;
    return 15000;
  }, [readingTime]);

  useEffect(() => {
    const handleScroll = () => setProgress(calculateScrollProgress());
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isCompleted || autoMarked) return;
    if (progress < 90) return;

    const timer = window.setTimeout(() => {
      setPostCompletion(postSlug, true);
      setAutoMarked(true);
    }, autoCompleteDelay);

    return () => window.clearTimeout(timer);
  }, [autoCompleteDelay, autoMarked, isCompleted, postSlug, progress, setPostCompletion]);

  const handleToggle = () => {
    setPostCompletion(postSlug, !isCompleted);
  };

  return (
    <div className="mt-12 rounded-xl border border-border bg-background/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">
            Reading progress
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {Math.round(progress)}% read
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            isCompleted
              ? 'bg-success/10 text-success'
              : 'bg-foreground text-background hover:bg-foreground/90'
          }`}
          aria-pressed={isCompleted}
        >
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
          {isCompleted ? 'Completed' : 'Mark complete'}
        </button>
      </div>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-foreground transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Auto-completes after you reach the end and linger for a moment.
      </p>
    </div>
  );
}
