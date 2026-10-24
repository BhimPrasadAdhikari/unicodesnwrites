'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Newspaper } from 'lucide-react';

type Props =
  | { mode: 'article'; postId: string; compact?: boolean }
  | { mode: 'digest'; candidateCount: number; compact?: boolean };

/**
 * Builds a draft campaign from a published article (or this week's unsent
 * articles) and opens the review & send desk for it.
 */
export function CreateCampaignFromPostsButton(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; newsletterId?: string } | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/newsletters/from-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props.mode === 'article' ? { mode: 'article', postId: props.postId } : { mode: 'digest' }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError({ message: payload?.error || 'Campaign could not be created.', newsletterId: payload?.newsletterId });
        return;
      }
      router.push(`/dashboard/newsletters/${payload._id}/send`);
    } catch {
      setError({ message: 'Campaign could not be created.' });
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || (props.mode === 'digest' && props.candidateCount === 0);
  const label = props.mode === 'article'
    ? 'Email'
    : props.candidateCount === 0
      ? 'No new articles for a digest'
      : `Weekly digest (${props.candidateCount} new)`;

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={create}
        disabled={disabled}
        title={props.mode === 'article' ? 'Create an email campaign for this article' : 'Create a digest of published articles that have not been emailed yet'}
        className={props.compact
          ? 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-foreground transition-colors hover:bg-secondary disabled:opacity-50'
          : 'inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : props.mode === 'article' ? <Mail className="h-3.5 w-3.5" /> : <Newspaper className="h-4 w-4" />}
        {label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-right text-xs text-destructive">
          {error.message}
          {error.newsletterId && (
            <> <Link href={`/dashboard/newsletters/${error.newsletterId}/report`} className="underline underline-offset-2">View campaign</Link></>
          )}
        </span>
      )}
    </span>
  );
}
