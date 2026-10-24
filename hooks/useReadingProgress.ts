'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'uw:reader-progress:v1';

interface ReadingProgressData {
  completedPosts: string[];
  updatedAt?: string;
}

const parseProgress = (value: string | null): ReadingProgressData => {
  if (!value) {
    return { completedPosts: [] };
  }

  try {
    const parsed = JSON.parse(value) as ReadingProgressData;
    if (!parsed || !Array.isArray(parsed.completedPosts)) {
      return { completedPosts: [] };
    }

    return {
      completedPosts: parsed.completedPosts.filter(Boolean),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { completedPosts: [] };
  }
};

const readProgress = () => parseProgress(window.localStorage.getItem(STORAGE_KEY));

const writeProgress = (completedPosts: string[]) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ completedPosts, updatedAt: new Date().toISOString() })
  );
};

export function useReadingProgress() {
  const [completedPosts, setCompletedPosts] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return readProgress().completedPosts;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setCompletedPosts(parseProgress(event.newValue).completedPosts);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setPostCompletion = useCallback((slug: string, isComplete: boolean) => {
    setCompletedPosts((prev) => {
      const next = new Set(prev);
      if (isComplete) {
        next.add(slug);
      } else {
        next.delete(slug);
      }

      const updated = Array.from(next);
      if (typeof window !== 'undefined') {
        writeProgress(updated);
      }

      return updated;
    });
  }, []);

  const isPostCompleted = useCallback(
    (slug: string) => completedPosts.includes(slug),
    [completedPosts]
  );

  return {
    completedPosts,
    setPostCompletion,
    isPostCompleted,
  };
}
