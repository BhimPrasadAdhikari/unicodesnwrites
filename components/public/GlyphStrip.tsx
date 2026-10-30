import Link from 'next/link';

import { SiteIcon, type SiteIconKind } from '@/components/ui/SiteIcon';

const SECTIONS: { kind: SiteIconKind; title: string; detail: string; href: string }[] = [
  { kind: 'articles', title: 'Articles', detail: 'Easy reads on AI', href: '/blog' },
  { kind: 'courses', title: 'Courses', detail: 'Learn step by step', href: '/courses' },
  { kind: 'projects', title: 'Projects', detail: "Things I've built", href: '/projects' },
  { kind: 'shop', title: 'Shop', detail: 'Guides & kits', href: '/products' },
  { kind: 'newsletter', title: 'Newsletter', detail: 'Free updates by email', href: '/newsletter' },
];

/** The five parts of the site as a row of cells: a quick "where do I go?" for new readers. */
export function GlyphStrip() {
  return (
    <nav aria-label="Sections of the site" className="border-b border-border">
      <div className="mx-auto max-w-6xl md:px-8">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 md:border-x md:border-border lg:grid-cols-5">
        {SECTIONS.map((section, index) => (
          <Link
            key={section.kind}
            href={section.href}
            className={
              // The fifth cell spans the last row on phones so it doesn't sit alone next to a gap.
              'group flex items-center gap-3.5 bg-background px-5 py-5 transition-colors hover:bg-card' +
              (index === SECTIONS.length - 1 ? ' col-span-2 sm:col-span-1' : '')
            }
          >
            <SiteIcon kind={section.kind} size={34} className="text-foreground group-hover:text-primary" />
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
