'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, X } from 'lucide-react';

import type { TocHeading } from '@/lib/utils/toc-headings';

interface BlogTableOfContentsProps {
  headings: TocHeading[];
  variant?: 'desktop' | 'mobile';
}

const TOP_OFFSET = 112;

export default function BlogTableOfContents({
  headings,
  variant = 'desktop',
}: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const visibleHeadings = useMemo(
    () => headings.filter((heading) => heading.level >= 1 && heading.level <= 4),
    [headings],
  );

  useEffect(() => {
    if (visibleHeadings.length < 2) return;

    const updateActiveHeading = () => {
      let currentId = visibleHeadings[0]?.id ?? null;

      for (const heading of visibleHeadings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= TOP_OFFSET) currentId = heading.id;
        else break;
      }

      setActiveId(currentId);
    };

    updateActiveHeading();
    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    window.addEventListener('resize', updateActiveHeading);
    window.addEventListener('hashchange', updateActiveHeading);
    return () => {
      window.removeEventListener('scroll', updateActiveHeading);
      window.removeEventListener('resize', updateActiveHeading);
      window.removeEventListener('hashchange', updateActiveHeading);
    };
  }, [visibleHeadings]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  if (visibleHeadings.length < 2) return null;

  const activeIndex = Math.max(0, visibleHeadings.findIndex((heading) => heading.id === activeId));
  const activeHeading = visibleHeadings[activeIndex] ?? visibleHeadings[0];
  const progress = ((activeIndex + 1) / visibleHeadings.length) * 100;

  const selectHeading = (heading: TocHeading) => {
    const target = document.getElementById(heading.id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${heading.id}`);
    setActiveId(heading.id);
    setIsOpen(false);
  };

  const headingList = (
    <ol className="space-y-1">
      {visibleHeadings.map((heading, index) => {
        const active = activeId === heading.id;
        return (
          <li key={`${heading.id}-${index}`}>
            <button
              type="button"
              onClick={() => selectHeading(heading)}
              aria-current={active ? 'location' : undefined}
              className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm leading-5 transition-colors ${
                active ? 'bg-secondary font-semibold text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
              style={{ paddingLeft: `${12 + Math.max(0, heading.level - 2) * 12}px` }}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/20 font-mono text-2xs">
                {active ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span>{heading.text}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  if (variant === 'mobile') {
    return (
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-y border-border bg-background/95 sm:-mx-6 xl:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left sm:px-6"
          aria-label="Open table of contents"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-eyebrow text-muted-foreground">In this article</span>
            <span className="block truncate text-sm font-medium">{activeHeading.text}</span>
          </span>
          <span className="font-mono text-2xs text-muted-foreground">{activeIndex + 1}/{visibleHeadings.length}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="h-0.5 bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>

        {isOpen && (
          <div role="dialog" aria-label="Article table of contents" aria-modal="true" className="fixed inset-0 top-16 z-50 bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
              <div>
                <p className="text-eyebrow text-primary">Navigate this article</p>
                <p className="mt-1 text-sm text-muted-foreground">{visibleHeadings.length} sections · {activeIndex + 1} visited</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close table of contents" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100%-81px)] overflow-y-auto px-3 py-5 sm:px-5">{headingList}</div>
          </div>
        )}
      </div>
    );
  }

  // Desktop view is now handled by BlogPromptNavigator
  return null;
}
