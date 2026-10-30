'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpenText, Loader2, Sparkles } from 'lucide-react';

type AiNote = { title: string; explanation: string; evidence: string[]; checkYourself: string; savedToNotebook: boolean; notebookEntryId?: string; savedAt?: string };

export function AiNotesGenerator({ courseSlug, lessonSlug }: { courseSlug: string; lessonSlug: string }) {
  const [focus, setFocus] = useState('');
  const [note, setNote] = useState<AiNote | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setError('');
    setNote(null);
    if (focus.trim().length < 3) {
      setError('Enter a concept or question for the tutor.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI notes are unavailable.');
      setNote(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI notes are unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-eyebrow text-muted-foreground"><Sparkles className="h-4 w-4" /> Ask the transcript tutor</p>
      <p className="mt-2 text-2xs leading-5 text-muted-foreground">AI notes are generated on demand from this lesson transcript only.</p>
      <input value={focus} onChange={(event) => setFocus(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void generate(); }} placeholder="e.g. Why does attention need scaling?" className="mt-3 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring" />
      <button type="button" disabled={loading} onClick={() => void generate()} className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate grounded note</button>
      {error && <p role="alert" className="mt-3 text-xs leading-5 text-destructive">{error}</p>}
      {note && <div className="mt-4 space-y-3 rounded-lg border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-serif text-lg font-medium leading-snug">{note.title}</h3>{note.savedToNotebook && <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success/10 px-2 py-1 font-mono text-[11px] text-success"><BookOpenText className="h-3 w-3" /> Saved</span>}</div><p className="text-xs leading-5 text-muted-foreground">{note.explanation}</p><div><p className="text-eyebrow text-muted-foreground">Transcript evidence</p><ul className="mt-2 space-y-1">{note.evidence.map((item, index) => { const text = typeof item === 'string' ? item : typeof item === 'object' && item !== null ? `[${(item as { timestamp?: string; text?: string }).timestamp || ''}] ${(item as { timestamp?: string; text?: string }).text || ''}`.trim() : String(item); return <li key={index} className="font-mono text-[12px] leading-5 text-muted-foreground">{text}</li>; })}</ul></div><p className="pen-note text-[15px]">check yourself: {note.checkYourself}</p>{note.savedToNotebook ? <Link href="/learn/notebook" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-primary decoration-2 underline-offset-4"><BookOpenText className="h-3.5 w-3.5" /> See my notes</Link> : <p className="text-2xs text-warning">The note was generated, but could not be saved to your notes.</p>}</div>}
    </section>
  );
}
