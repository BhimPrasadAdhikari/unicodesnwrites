'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { ArticleSummary } from '@/lib/services/article-summary';

export default function ArticleSummaryCard({ postSlug }: { postSlug: string }) {
  const [summary, setSummary] = useState<ArticleSummary | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (summary) {
      setExpanded((prev) => !prev);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/posts/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: postSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Summary unavailable');
      setSummary(data);
      setExpanded(true);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError(err instanceof Error ? err.message : 'Summary unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-10 rounded-xl border border-foreground bg-card px-5 py-1">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={expanded}
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
      >
        <span className="font-mono text-[12px] tracking-[0.08em] text-foreground">TL;DR · 3-MINUTE SUMMARY</span>
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {error && <p className="pb-3 text-sm text-destructive">{error}</p>}

      {expanded && summary && (
        <div className="space-y-5 border-t border-border pb-5 pt-4">
          <p className="font-serif text-[19px] leading-[1.55] text-foreground">{summary.tldr}</p>

          <div>
            <p className="mb-2 text-eyebrow text-muted-foreground">Key takeaways</p>
            <ul className="space-y-2">
              {summary.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="grid grid-cols-[22px_1fr] gap-1 text-[15px] leading-6 text-muted-foreground">
                  <span className="font-mono text-[12px] leading-6 text-primary">{String(idx + 1).padStart(2, '0')}</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="pen-note text-base">for: {summary.targetAudience}</p>
        </div>
      )}
    </div>
  );
}
