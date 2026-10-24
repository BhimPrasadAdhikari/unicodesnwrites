'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { ChevronUp, ChevronDown, ListFilter } from 'lucide-react';
import type { TocHeading } from '@/lib/utils/toc-headings';

interface BlogPromptNavigatorProps {
  headings: TocHeading[];
}

const TOP_NAV_OFFSET = 100;

export default function BlogPromptNavigator({ headings }: BlogPromptNavigatorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const visibleHeadings = useMemo(
    () => headings.filter((h) => h.level >= 1 && h.level <= 4),
    [headings]
  );

  // Track active heading on page scroll
  useEffect(() => {
    if (visibleHeadings.length === 0) return;

    const handleScroll = () => {
      let currentId = visibleHeadings[0]?.id ?? null;

      for (const heading of visibleHeadings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top <= TOP_NAV_OFFSET + 40) {
          currentId = heading.id;
        } else {
          break;
        }
      }

      setActiveId(currentId);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [visibleHeadings]);

  // Auto-scroll the TOC list so the active item is always visible inside the fixed-height box
  useEffect(() => {
    if (!activeId) return;
    const buttonEl = itemRefs.current.get(activeId);
    if (buttonEl && listContainerRef.current) {
      buttonEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  if (visibleHeadings.length < 2) return null;

  const activeIndex = Math.max(
    0,
    visibleHeadings.findIndex((h) => h.id === activeId)
  );

  const progressPercent =
    visibleHeadings.length > 1
      ? (activeIndex / (visibleHeadings.length - 1)) * 100
      : 0;

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = el.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - TOP_NAV_OFFSET;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    window.history.replaceState(null, '', `#${id}`);
    setActiveId(id);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const endCta = document.getElementById('blog-post-shell');
    if (endCta) {
      const bottom = endCta.getBoundingClientRect().bottom + window.pageYOffset - 200;
      window.scrollTo({ top: bottom, behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="Table of contents navigation"
      className="w-[190px] 2xl:w-[225px] select-none rounded-xl border border-border bg-card p-3 transition-all"
    >
      {/* Header with counter and scroll to top */}
      <div className="mb-2.5 flex items-center justify-between border-b border-border/50 pb-2 px-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-eyebrow">Contents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-2xs text-muted-foreground/80 font-medium">
            {activeIndex + 1}/{visibleHeadings.length}
          </span>
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Scroll to top of article"
            title="Scroll to top"
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Fixed Height List Area */}
      <div
        ref={listContainerRef}
        className="relative h-[250px] 2xl:h-[280px] overflow-y-auto pr-1 space-y-1 overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60"
      >
        {visibleHeadings.map((heading, index) => {
          const isActive = activeId === heading.id;
          const isVisited = index <= activeIndex;
          const isSub = heading.level > 2;

          return (
            <button
              key={`${heading.id}-${index}`}
              ref={(el) => {
                if (el) itemRefs.current.set(heading.id, el);
                else itemRefs.current.delete(heading.id);
              }}
              type="button"
              onClick={() => scrollToHeading(heading.id)}
              aria-current={isActive ? 'location' : undefined}
              title={heading.text}
              className={`group flex w-full items-center gap-2.5 rounded-lg py-1.5 px-2 text-left transition-all ${
                isSub ? 'pl-4' : 'pl-2'
              } ${
                isActive
                  ? 'bg-secondary text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              {/* Node dot with active glow */}
              <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <span
                  className={`rounded-full transition-all duration-200 ${
                    isActive
                      ? 'h-2.5 w-2.5 bg-primary ring-4 ring-primary/20'
                      : isVisited
                      ? 'h-1.5 w-1.5 bg-foreground/60'
                      : isSub
                      ? 'h-1 w-1 bg-muted-foreground/35 group-hover:bg-foreground/60'
                      : 'h-1.5 w-1.5 bg-muted-foreground/45 group-hover:bg-foreground/70'
                  }`}
                />
              </span>

              {/* Title Text */}
              <span
                className={`truncate leading-snug ${
                  isSub ? 'text-2xs' : 'text-xs'
                }`}
              >
                {heading.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer with progress bar & scroll to bottom */}
      <div className="mt-2.5 flex items-center gap-2 border-t border-border/50 pt-2 px-1">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom of article"
          title="Scroll to end"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}
