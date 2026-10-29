'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type Action = 'approve' | 'hide' | 'delete';

const ACTIONS: { action: Action; label: string }[] = [
  { action: 'approve', label: 'Approve' },
  { action: 'hide', label: 'Hide' },
  { action: 'delete', label: 'Delete' },
];

type Selection = { selected: Set<string>; toggle: (id: string, on: boolean) => void };
const SelectionContext = createContext<Selection | null>(null);

/**
 * Wraps a server-rendered moderation list: rows render <BulkSelectCheckbox>,
 * and a sticky bar runs approve/hide/delete on the ticked rows through
 * /api/admin/<target>/bulk, then refreshes the page.
 */
export function BulkModeration({
  target,
  ids,
  children,
}: {
  target: 'comments' | 'reviews';
  /** Ids of the rows on this page, for "select all" */
  ids: string[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [running, setRunning] = useState<Action | null>(null);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState('');

  // Rows that left the page (deleted, filtered, paged away) drop out of the selection.
  const selected = ids.filter((id) => picked.has(id));
  const allSelected = ids.length > 0 && selected.length === ids.length;

  const toggle = (id: string, on: boolean) => {
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    setArmed(false);
  };

  const run = async (action: Action) => {
    if (action === 'delete' && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setRunning(action);
    setError('');
    try {
      const response = await fetch(`/api/admin/${target}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Could not ${action} ${target}`);
      setPicked(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} ${target}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <SelectionContext.Provider value={{ selected: new Set(selected), toggle }}>
      {ids.length > 0 ? (
        <label className="mb-3 inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-foreground"
            checked={allSelected}
            onChange={(event) => {
              setPicked(event.target.checked ? new Set(ids) : new Set());
              setArmed(false);
            }}
          />
          Select all {ids.length} on this page
        </label>
      ) : null}

      {children}

      {selected.length > 0 ? (
        <div
          role="region"
          aria-label={`Bulk actions for selected ${target}`}
          className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-overlay"
        >
          <span className="mr-auto text-sm font-medium" aria-live="polite">{selected.length} selected</span>
          {ACTIONS.map(({ action, label }) => {
            const isArmed = action === 'delete' && armed;
            return (
              <button
                key={action}
                type="button"
                onClick={() => run(action)}
                onBlur={() => isArmed && setArmed(false)}
                disabled={running !== null}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition disabled:opacity-50',
                  action === 'delete'
                    ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    : action === 'approve'
                      ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                      : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                )}
              >
                {running === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {isArmed ? `Confirm delete ${selected.length}` : label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setPicked(new Set());
              setArmed(false);
            }}
            disabled={running !== null}
            className="min-h-9 px-2 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Clear
          </button>
          {error ? <p role="alert" className="basis-full text-xs text-destructive">{error}</p> : null}
        </div>
      ) : error ? (
        <p role="alert" className="mt-4 text-xs text-destructive">{error}</p>
      ) : null}
    </SelectionContext.Provider>
  );
}

/** A row's tick box; must sit inside <BulkModeration>. */
export function BulkSelectCheckbox({ id, label }: { id: string; label: string }) {
  const selection = useContext(SelectionContext);
  if (!selection) return null;
  return (
    // The label pads the small box out to a comfortable tap target.
    <label className="-m-2 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        aria-label={label}
        className="h-4 w-4 cursor-pointer accent-foreground"
        checked={selection.selected.has(id)}
        onChange={(event) => selection.toggle(id, event.target.checked)}
      />
    </label>
  );
}
