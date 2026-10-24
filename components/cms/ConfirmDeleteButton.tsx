'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

interface ConfirmDeleteButtonProps {
  label: string;
  onConfirm: () => Promise<void>;
  onError?: (message: string) => void;
  compact?: boolean;
}

export function ConfirmDeleteButton({ label, onConfirm, onError, compact = false }: ConfirmDeleteButtonProps) {
  const [armed, setArmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const runDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setArmed(false);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : `${label} could not be deleted.`);
    } finally {
      setLoading(false);
    }
  };

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1">
        <button type="button" onClick={runDelete} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Confirm
        </button>
        <button type="button" onClick={() => setArmed(false)} disabled={loading} className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setArmed(true)} aria-label={`Delete ${label}`} className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-destructive transition hover:bg-destructive/10 ${compact ? 'p-2' : 'px-2.5 py-1.5 text-xs font-semibold'}`}>
      <Trash2 className="h-4 w-4" />
      {!compact && 'Delete'}
    </button>
  );
}
