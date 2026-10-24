'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export type AdminAction = {
  label: string;
  url: string;
  method: 'PATCH' | 'DELETE' | 'POST';
  body?: Record<string, unknown>;
  /** Ask once more before running (destructive or hard to undo) */
  confirm?: string;
  tone?: 'default' | 'danger' | 'primary';
};

/** Buttons that call an admin API and refresh the server-rendered list on success. */
export function AdminRowActions({ actions, className }: { actions: AdminAction[]; className?: string }) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [error, setError] = useState('');

  const run = async (action: AdminAction) => {
    if (action.confirm && armed !== action.label) {
      setArmed(action.label);
      return;
    }
    setArmed(null);
    setRunning(action.label);
    setError('');
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.body ? { 'Content-Type': 'application/json' } : undefined,
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `${action.label} failed`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action.label} failed`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {actions.map((action) => {
        const isArmed = armed === action.label;
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => run(action)}
            onBlur={() => isArmed && setArmed(null)}
            disabled={running !== null}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition disabled:opacity-50',
              action.tone === 'danger' || isArmed
                ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                : action.tone === 'primary'
                  ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )}
          >
            {running === action.label ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isArmed ? action.confirm : action.label}
          </button>
        );
      })}
      {error ? <p role="alert" className="basis-full text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
