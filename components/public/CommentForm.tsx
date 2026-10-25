'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export default function CommentForm({ postSlug }: { postSlug: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (status === 'loading') return null;

  if (!session?.user) {
    return (
      <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        <Link href={`/login?from=${encodeURIComponent(`/blog/${postSlug}#comments`)}`} className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4">
          Sign in
        </Link>{' '}
        to join the discussion.
      </p>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postSlug, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your comment could not be posted.');
      setBody('');
      setMessage({ ok: true, text: data.message });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Your comment could not be posted.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="comment-body" className="sr-only">Your comment</label>
      <textarea
        id="comment-body"
        required
        minLength={2}
        maxLength={2000}
        rows={4}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="A question, a correction, or what you built with this…"
        className="w-full rounded-xl border border-border bg-card p-4 text-[15px] leading-relaxed"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Commenting as {session.user.name}. Comments are reviewed before they appear.</p>
        <button
          type="submit"
          disabled={sending || body.trim().length < 2}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Post comment
        </button>
      </div>
      {message ? <p role="status" className={`text-sm ${message.ok ? 'text-success' : 'text-destructive'}`}>{message.text}</p> : null}
    </form>
  );
}
