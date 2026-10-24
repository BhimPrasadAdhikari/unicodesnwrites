import Link from 'next/link';
import { Github, Linkedin } from 'lucide-react';

import { Glyph } from '@/components/ui/Glyph';
import { Lockup } from '@/components/ui/Logo';
import { Container } from '@/components/ui/Section';
import { siteConfig } from '@/lib/config/site.config';

const readLinks = [
  { href: '/blog', label: 'Writing' },
  { href: '/blog/series', label: 'Series' },
  { href: '/search', label: 'Search' },
  { href: '/projects', label: 'Builds' },
];

const learnLinks = [
  { href: '/courses', label: 'Courses' },
  { href: '/products', label: 'Tools' },
  { href: '/newsletter', label: 'Letters' },
];

const elsewhereLinks = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/feed.xml', label: 'RSS feed' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

function Column({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-4 text-eyebrow text-muted-foreground">{title}</p>
      <nav className="flex flex-col gap-1" aria-label={title}>
        {links.map((link) =>
          // The feed is a route handler, not a page: a plain link avoids a client-side navigation attempt.
          link.href.endsWith('.xml') ? (
            <a key={link.href} href={link.href} className="py-1.5 text-[15px] text-foreground transition-colors hover:text-primary">
              {link.label}
            </a>
          ) : (
            <Link key={link.href} href={link.href} className="py-1.5 text-[15px] text-foreground transition-colors hover:text-primary">
              {link.label}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container className="max-w-[1200px] py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr]">
          <div className="max-w-sm">
            <Link href="/" aria-label="unicodesnwrites home"><Lockup size={36} /></Link>
            <p className="mt-5 text-[15px] leading-7 text-muted-foreground">{siteConfig.description}</p>
            <Link href="/newsletter" className="mt-5 inline-flex items-center gap-2 text-[15px] font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">
              <Glyph kind="letters" size={18} className="text-primary" /> Join Letters
            </Link>
          </div>
          <Column title="Read" links={readLinks} />
          <Column title="Learn" links={learnLinks} />
          <Column title="Elsewhere" links={elsewhereLinks} />
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-muted-foreground">© {new Date().getFullYear()} unicodesnwrites · Set in Newsreader, Inter and JetBrains Mono.</p>
          <div className="flex items-center gap-2">
            <a href={siteConfig.social.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="touch-target rounded-md text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /></a>
            <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="touch-target rounded-md text-muted-foreground hover:text-foreground"><Linkedin className="h-4 w-4" /></a>
            <span className="font-mono text-xs text-muted-foreground">U+0075</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
