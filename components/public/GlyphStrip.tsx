import Link from 'next/link';

import { Glyph, type GlyphKind } from '@/components/ui/Glyph';

const SECTIONS: { kind: GlyphKind; title: string; detail: string; href: string }[] = [
  { kind: 'papers', title: 'Papers', detail: 'Dissected', href: '/blog' },
  { kind: 'agents', title: 'Agents', detail: 'Built in the open', href: '/blog' },
  { kind: 'builds', title: 'Build logs', detail: 'ML, shipped', href: '/projects' },
  { kind: 'courses', title: 'Courses', detail: 'First principles', href: '/courses' },
  { kind: 'tools', title: 'Tools', detail: 'Kits & books', href: '/products' },
  { kind: 'letters', title: 'Letters', detail: 'The newsletter', href: '/newsletter' },
];

/** The six content types as a row of chart cells: the site's table of contents. */
export function GlyphStrip() {
  return (
    <nav aria-label="Sections of the site" className="border-b border-border">
      <div className="mx-auto max-w-6xl md:px-8">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 md:border-x md:border-border lg:grid-cols-6">
        {SECTIONS.map((section) => (
          <Link
            key={section.kind}
            href={section.href}
            className="group flex items-center gap-3.5 bg-background px-5 py-5 transition-colors hover:bg-card"
          >
            <Glyph kind={section.kind} size={34} className="text-foreground group-hover:text-primary" />
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-semibold">{section.title}</span>
              <span className="truncate text-[13px] text-muted-foreground">{section.detail}</span>
            </span>
          </Link>
        ))}
        </div>
      </div>
    </nav>
  );
}
