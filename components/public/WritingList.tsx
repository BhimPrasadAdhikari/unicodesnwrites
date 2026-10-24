'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Glyph, GLYPHS, type GlyphKind } from '@/components/ui/Glyph';
import { cn } from '@/lib/utils';

export type WritingItem = {
  key: string;
  href: string;
  kind: GlyphKind;
  label: string;
  title: string;
  dek: string;
};

/** Two-column list of glyph-tiled entries with filter tabs for the content types present. */
export function WritingList({ items }: { items: WritingItem[] }) {
  const [filter, setFilter] = useState<GlyphKind | 'all'>('all');
  const kinds = Array.from(new Set(items.map((item) => item.kind)));
  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter);
  const tabs: { id: GlyphKind | 'all'; label: string }[] = [{ id: 'all', label: 'All' }, ...kinds.map((kind) => ({ id: kind, label: GLYPHS[kind].name }))];

  return (
    <div className="flex flex-col gap-2">
      {kinds.length > 1 ? (
        <div role="tablist" aria-label="Filter writing" className="no-scrollbar -mx-6 flex gap-1 overflow-x-auto border-b border-border px-6 md:mx-0 md:px-0">
          {tabs.map((tab) => {
            const active = tab.id === filter;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  '-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 text-[15px] transition-colors',
                  active ? 'border-primary font-semibold text-foreground' : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.id !== 'all' ? <Glyph kind={tab.id} size={18} /> : null}
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="grid md:grid-cols-2 md:gap-x-12">
        {shown.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group grid grid-cols-[52px_minmax(0,1fr)] items-start gap-4 border-b border-border py-6 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-5"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-border bg-card sm:h-16 sm:w-16">
              <Glyph kind={item.kind} size={30} className="group-hover:text-primary" />
            </span>
            <span className="flex min-w-0 flex-col gap-2">
              <span className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">{item.label}</span>
              <span className="font-serif text-[clamp(1.25rem,2vw,1.5625rem)] font-medium leading-[1.2] tracking-[-0.01em] group-hover:text-primary">
                {item.title}
              </span>
              {item.dek ? <span className="line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">{item.dek}</span> : null}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
