'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { SiteIcon } from '@/components/ui/SiteIcon';

export type NotebookEntryDTO = {
  id: string;
  courseTitle: string;
  courseSlug: string;
  lessonTitle: string;
  lessonSlug: string;
  focus: string;
  title: string;
  explanation: string;
  evidence: string[];
  checkYourself: string;
  createdAt: string;
};

export function LearnerNotebook({ initialEntries }: { initialEntries: NotebookEntryDTO[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter((entry) => [entry.title, entry.focus, entry.explanation, entry.courseTitle, entry.lessonTitle, ...entry.evidence].some((value) => value.toLowerCase().includes(normalized)));
  }, [entries, query]);

  const remove = async (id: string) => {
    setDeleting(id); setError('');
    try {
      const response = await fetch(`/api/notebook/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete this note.');
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete this note.');
    } finally { setDeleting(null); }
  };

  return <div>
    <div className="flex min-h-12 items-center gap-3 rounded-lg border border-input bg-card px-4"><Search className="h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search concepts, evidence, or courses" aria-label="Search your notes" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" /><span className="font-mono text-[12px] text-muted-foreground">{visibleEntries.length} NOTES</span></div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {visibleEntries.length ? <div className="mt-6 grid gap-5 lg:grid-cols-2">{visibleEntries.map((entry) => <article key={entry.id} className="flex flex-col rounded-xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{entry.courseTitle}</p><h2 className="mt-2 font-serif text-[22px] font-medium leading-tight">{entry.title}</h2></div><button type="button" onClick={() => void remove(entry.id)} disabled={deleting === entry.id} aria-label={`Delete ${entry.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div><p className="mt-2 text-xs text-muted-foreground">From {entry.lessonTitle} · {new Date(entry.createdAt).toLocaleDateString()}</p><p className="mt-4 font-serif text-[17px] leading-[1.6] text-foreground">{entry.explanation}</p><div className="mt-5 rounded-lg border border-border bg-background p-4"><p className="text-eyebrow text-muted-foreground">Transcript evidence</p><ul className="mt-2 space-y-2">{entry.evidence.map((item, index) => { const text = typeof item === 'string' ? item : typeof item === 'object' && item !== null ? `[${(item as { timestamp?: string; text?: string }).timestamp || ''}] ${(item as { timestamp?: string; text?: string }).text || ''}`.trim() : String(item); return <li key={index} className="font-mono text-[12px] leading-5 text-muted-foreground">{text}</li>; })}</ul></div><p className="pen-note mt-5 text-base">check yourself: {entry.checkYourself}</p><div className="mt-auto pt-5"><Button asChild variant="outline"><Link href={`/courses/${entry.courseSlug}/learn/${entry.lessonSlug}`}>Return to lesson</Link></Button></div></article>)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center"><SiteIcon kind="learning" size={48} className="mx-auto text-muted-foreground" /><h2 className="mt-4 font-serif text-[28px] font-medium">{entries.length ? 'No notes match that search.' : 'Your notes will show up here.'}</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{entries.length ? 'Try a course title, concept, or phrase from the transcript evidence.' : 'Make a note from any lesson and it is saved here, so you can look back at it on any device.'}</p>{!entries.length && <Button asChild className="mt-6"><Link href="/learn">Continue learning</Link></Button>}</div>}
  </div>;
}
