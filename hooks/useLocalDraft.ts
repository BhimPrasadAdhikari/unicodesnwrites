'use client';

import { useEffect, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';

export function useLocalDraft(
  key: string,
  form: UseFormReturn<any>,
  dependencies: any[] = []
) {
  const { watch, reset, getValues } = form;

  // Load draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedDraft = localStorage.getItem(key);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const confirmLoad = window.confirm(
          'A saved draft was found. Do you want to restore it?'
        );
        if (confirmLoad) {
          reset(parsed);
        }
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only run on mount when key changes

  // Save draft on change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const subscription = watch((value) => {
      localStorage.setItem(key, JSON.stringify(value));
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, watch, ...dependencies]);

  // Clear draft helper
  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }, [key]);

  return { clearDraft };
}
