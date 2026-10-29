'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, X } from 'lucide-react';
import { BOUNCED_TAG, MAX_SUBSCRIBER_TAGS, subscriberTagSchema } from '@/lib/utils/validations/subscriber';

interface SubscriberTagEditorProps {
  subscriberId: string;
  email: string;
  tags: string[];
  /** Tags already in use, offered as suggestions while typing. */
  suggestions: string[];
}

const chipStyles = 'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-2xs font-medium';

export default function SubscriberTagEditor({ subscriberId, email, tags: initialTags, suggestions }: SubscriberTagEditorProps) {
  const router = useRouter();
  const id = useId();
  const inputId = `${id}-tag`;
  const errorId = `${id}-error`;
  const listId = `${id}-suggestions`;
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [tags, setTags] = useState(initialTags);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Focus goes back to "Add tag" after the editor closes or a chip is removed (it renders a tick later).
  const [returnFocus, setReturnFocus] = useState(false);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (!returnFocus) return;
    addButtonRef.current?.focus();
    setReturnFocus(false);
  }, [returnFocus]);

  // Sends the whole list; the API replaces the subscriber's tags with it.
  const save = async (next: string[]) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/subscribers/${encodeURIComponent(subscriberId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: next }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Tags could not be saved.');
      setTags(Array.isArray(payload?.tags) ? payload.tags : next);
      router.refresh();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Tags could not be saved.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closeEditor = () => {
    setAdding(false);
    setDraft('');
    setError(null);
    setReturnFocus(true);
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = subscriberTagSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Enter a valid tag.');
      inputRef.current?.focus();
      return;
    }
    if (tags.includes(parsed.data)) {
      setError(`Already tagged “${parsed.data}”.`);
      inputRef.current?.focus();
      return;
    }
    if (tags.length >= MAX_SUBSCRIBER_TAGS) {
      setError(`A subscriber can have at most ${MAX_SUBSCRIBER_TAGS} tags.`);
      return;
    }
    if (await save([...tags, parsed.data])) closeEditor();
    else inputRef.current?.focus();
  };

  const handleRemove = async (tag: string) => {
    if (await save(tags.filter((item) => item !== tag))) setReturnFocus(true);
  };

  return (
    <div className="space-y-1.5">
      <ul aria-label={`Tags for ${email}`} className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <li key={tag} className={`${chipStyles} ${tag === BOUNCED_TAG ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-border bg-muted/60 text-foreground'}`}>
            {tag}
            <button
              type="button"
              onClick={() => handleRemove(tag)}
              disabled={saving}
              aria-label={`Remove tag ${tag} from ${email}`}
              className="-mr-1 rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </li>
        ))}
        {!adding && tags.length < MAX_SUBSCRIBER_TAGS && (
          <li>
            <button
              ref={addButtonRef}
              type="button"
              onClick={() => { setAdding(true); setError(null); }}
              disabled={saving}
              aria-label={`Add a tag to ${email}`}
              className={`${chipStyles} border-dashed border-border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50`}
            >
              {saving ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />} Tag
            </button>
          </li>
        )}
      </ul>

      {adding && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-1.5">
          <label htmlFor={inputId} className="sr-only">New tag for {email}</label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            list={listId}
            maxLength={32}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') closeEditor(); }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder="e.g. ai-course"
            disabled={saving}
            className="h-8 w-36 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
          />
          <datalist id={listId}>
            {suggestions.filter((tag) => !tags.includes(tag)).map((tag) => <option key={tag} value={tag} />)}
          </datalist>
          <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1 rounded-lg bg-foreground px-2.5 text-xs font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-50">
            {saving && <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />} Save
          </button>
          <button type="button" onClick={closeEditor} disabled={saving} className="px-1 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
        </form>
      )}

      {error && <p id={errorId} role="alert" className="text-2xs text-destructive">{error}</p>}
    </div>
  );
}
