'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, BookOpenCheck, LogIn, LogOut, Menu, Settings, X } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

import { Button } from '@/components/ui/Button';
import { Glyph, type GlyphKind } from '@/components/ui/Glyph';
import { Lockup } from '@/components/ui/Logo';
import { Container } from '@/components/ui/Section';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

const primaryLinks: { href: string; label: string; glyph: GlyphKind }[] = [
  { href: '/blog', label: 'Writing', glyph: 'papers' },
  { href: '/courses', label: 'Courses', glyph: 'courses' },
  { href: '/projects', label: 'Builds', glyph: 'builds' },
  { href: '/products', label: 'Tools', glyph: 'tools' },
];

const mobileLinks: { href: string; label: string; glyph?: GlyphKind }[] = [
  ...primaryLinks,
  { href: '/newsletter', label: 'Letters', glyph: 'letters' },
  { href: '/about', label: 'About' },
];

const isCurrentPath = (pathname: string, href: string) =>
  pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => setIsOpen(false), [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-xl transition-colors',
          isScrolled && 'border-border',
        )}
      >
        <Container className="flex h-16 max-w-[1440px] items-center justify-between gap-6">
          <Link href="/" className="flex shrink-0 items-center" aria-label="unicodesnwrites home">
            <Lockup size={34} wordmarkClassName="hidden text-base sm:inline" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {primaryLinks.map((link) => {
              const active = isCurrentPath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'px-3 py-2 text-[15px] font-medium underline-offset-[10px] transition-colors',
                    active ? 'text-foreground underline decoration-primary decoration-2' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            {status === 'authenticated' ? <>
              <Link href={session.user.role === 'admin' ? '/dashboard' : '/learn'} className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><BookOpenCheck className="h-4 w-4" />{session.user.role === 'admin' ? 'Admin studio' : 'My learning'}</Link>
              <Link href="/account" aria-label="Account settings" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Settings className="h-4 w-4" /></Link>
              <button type="button" onClick={() => signOut({ callbackUrl: '/' })} aria-label="Sign out" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="h-4 w-4" /></button>
            </> : status === 'unauthenticated' ? <Link href="/login" className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><LogIn className="h-4 w-4" /> Sign in</Link> : null}
            <Link
              href="/about"
              aria-current={isCurrentPath(pathname, '/about') ? 'page' : undefined}
              className="inline-flex h-9 items-center px-3 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Button asChild variant="primary" size="sm" className="h-10 px-4">
              <Link href="/newsletter">Subscribe</Link>
            </Button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={isOpen}
              onClick={() => setIsOpen((value) => !value)}
              className="rounded-full"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </Container>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Site navigation"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-16 z-40 bg-background lg:hidden"
          >
            <Container className="flex h-full flex-col overflow-y-auto pb-8 pt-8">
              <p className="mb-5 text-eyebrow text-primary">The notebook</p>
              <nav className="flex flex-col" aria-label="Mobile navigation">
                {mobileLinks.map((link, index) => {
                  const active = isCurrentPath(pathname, link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.035 }}
                      className="border-b border-border"
                    >
                      <Link
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className="flex items-center gap-4 py-4 font-serif text-[28px] font-medium tracking-[-0.015em]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center text-muted-foreground">{link.glyph ? <Glyph kind={link.glyph} size={24} /> : null}</span>
                        <span className={cn('flex-1', active && 'underline decoration-primary decoration-2 underline-offset-8')}>{link.label}</span>
                        <ArrowUpRight className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
              <div className="mt-auto pt-10">
                <div className="mb-6 flex gap-3">
                  {status === 'authenticated' ? <><Button asChild variant="outline" className="flex-1"><Link href={session.user.role === 'admin' ? '/dashboard' : '/learn'}>{session.user.role === 'admin' ? 'Admin studio' : 'My learning'}</Link></Button><Button asChild variant="outline" size="icon" className="rounded-full"><Link href="/account" aria-label="Account settings"><Settings className="h-4 w-4" /></Link></Button><Button variant="outline" size="icon" onClick={() => signOut({ callbackUrl: '/' })} aria-label="Sign out" className="rounded-full"><LogOut className="h-4 w-4" /></Button></> : <><Button asChild variant="outline" className="flex-1"><Link href="/signup">Create account</Link></Button><Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button></>}
                </div>
                <Button asChild variant="primary" className="mb-6 h-12 w-full"><Link href="/newsletter">Subscribe to Letters</Link></Button>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  AI papers taken apart, agents built in the open, and the tools that come out of them.
                </p>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
