'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';

import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { Alert } from '@/components/ui/Alert';
import { generateSlug } from '@/lib/utils/slug';
import { extractYouTubeVideoId } from '@/lib/utils/youtube';
import { fromIstDateTimeLocal, toIstDateTimeLocal } from '@/lib/utils/video-series';

export interface VideoPartFormData {
  key: string;
  title: string;
  /** A YouTube URL or the 11-character id. */
  video: string;
  summary: string;
  /** `datetime-local` value in IST (the channel's schedule time zone). */
  publishAt: string;
  /** Comma-separated topics used to attach the part to matching blog posts. */
  keywords: string;
}

export interface VideoSeriesFormData {
  title: string;
  slug: string;
  description: string;
  published: boolean;
  featured: boolean;
  parts: VideoPartFormData[];
}

const newKey = () => Math.random().toString(36).slice(2);

const emptyPart = (): VideoPartFormData => ({ key: newKey(), title: '', video: '', summary: '', publishAt: '', keywords: '' });

const inputClass =
  'block w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export default function VideoSeriesEditor({
  initialData,
  seriesId,
}: {
  initialData?: VideoSeriesFormData;
  seriesId?: string;
}) {
  const router = useRouter();
  const isEditing = Boolean(seriesId);
  const [formData, setFormData] = useState<VideoSeriesFormData>(
    initialData ?? { title: '', slug: '', description: '', published: false, featured: false, parts: [emptyPart()] },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialSnapshot] = useState(() => JSON.stringify(formData));
  useUnsavedChangesWarning(JSON.stringify(formData) !== initialSnapshot, saving);

  const set = <K extends keyof VideoSeriesFormData>(field: K, value: VideoSeriesFormData[K]) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const updatePart = (key: string, patch: Partial<VideoPartFormData>) =>
    setFormData((prev) => ({ ...prev, parts: prev.parts.map((part) => (part.key === key ? { ...part, ...patch } : part)) }));

  const movePart = (index: number, delta: -1 | 1) =>
    setFormData((prev) => {
      const parts = [...prev.parts];
      const target = index + delta;
      if (target < 0 || target >= parts.length) return prev;
      [parts[index], parts[target]] = [parts[target], parts[index]];
      return { ...prev, parts };
    });

  const removePart = (key: string) =>
    setFormData((prev) => ({ ...prev, parts: prev.parts.filter((part) => part.key !== key) }));

  const addPart = () =>
    setFormData((prev) => {
      // Default the next release to one week after the last part, same time of day.
      const last = prev.parts[prev.parts.length - 1];
      const lastDate = last?.publishAt ? fromIstDateTimeLocal(last.publishAt) : null;
      const next = emptyPart();
      if (lastDate) {
        next.publishAt = toIstDateTimeLocal(new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
      }
      return { ...prev, parts: [...prev.parts, next] };
    });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const slug = generateSlug(formData.slug || formData.title);
    if (formData.title.trim().length < 2) return setError('Series title must be at least 2 characters.');
    if (!slug) return setError('Please provide a valid URL slug.');

    const parts = [];
    for (const [index, part] of formData.parts.entries()) {
      const label = `Part ${index + 1}`;
      if (!part.title.trim()) return setError(`${label} needs a title.`);
      if (!extractYouTubeVideoId(part.video)) return setError(`${label}: paste a YouTube link or video id.`);
      const date = fromIstDateTimeLocal(part.publishAt);
      if (!date) return setError(`${label} needs a release date and time.`);
      parts.push({
        title: part.title.trim(),
        videoId: part.video.trim(),
        summary: part.summary.trim(),
        publishAt: date.toISOString(),
        keywords: part.keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean),
      });
    }

    setSaving(true);
    try {
      const response = await fetch(isEditing ? `/api/video-series/${seriesId}` : '/api/video-series', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          slug,
          description: formData.description.trim(),
          published: formData.published,
          featured: formData.featured,
          parts,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to ${isEditing ? 'update' : 'create'} the video series`);
      }
      router.push('/dashboard/videos');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-10">
      {error && <Alert variant="destructive">{error}</Alert>}

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value, slug: isEditing ? prev.slug : generateSlug(e.target.value) }))}
            required
            maxLength={120}
            className="w-full border-none bg-transparent p-0 font-serif text-4xl font-medium placeholder:text-muted-foreground/50 focus:ring-0"
            placeholder="Series title..."
          />
          <div>
            <label htmlFor="vs-description" className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              id="vs-description"
              value={formData.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={2000}
              rows={3}
              className={inputClass}
              placeholder="One or two sentences about what the series covers."
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card/70 p-5">
          <div>
            <label htmlFor="vs-slug" className="mb-2 block text-sm font-medium">Slug</label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>/videos/</span>
              <input id="vs-slug" type="text" value={formData.slug} onChange={(e) => set('slug', e.target.value)} required maxLength={120} className={inputClass} />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={formData.published} onChange={(e) => set('published', e.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-primary" />
            <span><span className="block text-sm font-medium">Published</span><span className="text-sm text-muted-foreground">Show the series at /videos.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={formData.featured} onChange={(e) => set('featured', e.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-primary" />
            <span><span className="block text-sm font-medium">Featured</span><span className="text-sm text-muted-foreground">Show a teaser card on /blog and /courses.</span></span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? 'Save changes' : 'Create series'}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold">Parts</h2>
            <p className="text-sm text-muted-foreground">
              In watch order. A part with a future release time shows as &ldquo;coming&rdquo; and is not embedded until then.
            </p>
          </div>
          <button type="button" onClick={addPart} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">
            <Plus className="h-4 w-4" /> Add part
          </button>
        </div>

        {formData.parts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No parts yet.</p>}

        <ol className="space-y-4">
          {formData.parts.map((part, index) => {
            const videoId = extractYouTubeVideoId(part.video);
            return (
              <li key={part.key} className="rounded-xl border border-border bg-card/70 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-eyebrow text-primary">Part {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => movePart(index, -1)} disabled={index === 0} aria-label={`Move part ${index + 1} up`} className="rounded-lg p-2 hover:bg-secondary disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => movePart(index, 1)} disabled={index === formData.parts.length - 1} aria-label={`Move part ${index + 1} down`} className="rounded-lg p-2 hover:bg-secondary disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => removePart(part.key)} aria-label={`Remove part ${index + 1}`} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <label className="block text-sm font-medium">
                    Title
                    <input type="text" value={part.title} onChange={(e) => updatePart(part.key, { title: e.target.value })} maxLength={160} className={`${inputClass} mt-1.5`} placeholder="How the KV Cache Works" />
                  </label>
                  <label className="block text-sm font-medium">
                    YouTube link or id
                    <input type="text" value={part.video} onChange={(e) => updatePart(part.key, { video: e.target.value })} className={`${inputClass} mt-1.5 font-mono`} placeholder="https://youtu.be/..." />
                    <span className={`mt-1 block text-xs font-normal ${part.video && !videoId ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {part.video ? (videoId ? `Video id: ${videoId}` : 'Not a YouTube link') : 'Paste the watch, share or Studio link'}
                    </span>
                  </label>
                  <label className="block text-sm font-medium md:col-span-2">
                    One-line summary
                    <input type="text" value={part.summary} onChange={(e) => updatePart(part.key, { summary: e.target.value })} maxLength={400} className={`${inputClass} mt-1.5`} />
                  </label>
                  <label className="block text-sm font-medium">
                    Goes public at (IST)
                    <input type="datetime-local" value={part.publishAt} onChange={(e) => updatePart(part.key, { publishAt: e.target.value })} className={`${inputClass} mt-1.5`} />
                  </label>
                  <label className="block text-sm font-medium">
                    Blog topics (comma-separated)
                    <input type="text" value={part.keywords} onChange={(e) => updatePart(part.key, { keywords: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="kv cache, key-value cache" />
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">Articles mentioning these get this video embedded.</span>
                  </label>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </form>
  );
}
