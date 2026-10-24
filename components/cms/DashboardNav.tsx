'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Cpu,
  CreditCard,
  GraduationCap,
  HeartPulse,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  Star,
  TicketPercent,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Glyph, type GlyphKind } from '@/components/ui/Glyph';
import { Mark } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon?: LucideIcon; glyph?: GlyphKind };

// Content types use their Codepoint glyph; tools of the trade keep a plain line icon.
const navGroups: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'Write',
    items: [
      { href: '/dashboard/posts', label: 'Posts', glyph: 'papers' },
      { href: '/dashboard/series', label: 'Series', icon: Layers },
      { href: '/dashboard/projects', label: 'Builds', glyph: 'builds' },
    ],
  },
  {
    label: 'Teach',
    items: [
      { href: '/dashboard/courses', label: 'Courses', glyph: 'courses' },
      { href: '/dashboard/enrollments', label: 'Enrollments', icon: GraduationCap },
    ],
  },
  {
    label: 'Sell',
    items: [
      { href: '/dashboard/products', label: 'Tools', glyph: 'tools' },
      { href: '/dashboard/sales', label: 'Sales', icon: CreditCard },
      { href: '/dashboard/purchases', label: 'Purchases', icon: ShoppingBag },
      { href: '/dashboard/coupons', label: 'Coupons', icon: TicketPercent },
      { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    label: 'Letters',
    items: [
      { href: '/dashboard/newsletters', label: 'Issues', glyph: 'letters' },
      { href: '/dashboard/subscribers', label: 'Subscribers', icon: Users },
    ],
  },
  {
    label: 'Readers',
    items: [
      { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
      { href: '/dashboard/members', label: 'Members', icon: UserRound },
    ],
  },
  {
    label: 'Measure',
    items: [
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/analytics/content', label: 'Content', icon: BarChart3 },
      { href: '/dashboard/analytics/ai', label: 'AI telemetry', icon: Cpu },
      { href: '/dashboard/health', label: 'System health', icon: HeartPulse },
    ],
  },
];

const isCurrent = (pathname: string, href: string) =>
  href === '/dashboard' || href === '/dashboard/analytics'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className={cn('flex items-center gap-3', compact && 'justify-center')}>
      <Mark size={36} />
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className="block truncate font-serif text-xl font-medium">Studio</span>
          <span className="mt-1 block font-mono text-[11px] tracking-[0.06em] text-muted-foreground">UNICODESNWRITES</span>
        </span>
      )}
    </Link>
  );
}

export default function DashboardNav({ user }: { user: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  const navigation = (compact = false) => (
    <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Dashboard navigation">
      {navGroups.map((group) => (
        <div key={group.label ?? 'top'} className="mb-5 last:mb-0">
          {!compact && group.label && <p className="mb-1.5 px-3 text-eyebrow text-muted-foreground">{group.label}</p>}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isCurrent(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={compact ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex h-11 items-center rounded-lg text-[15px] font-medium transition-colors',
                    compact ? 'justify-center px-2' : 'gap-3 px-3',
                    active
                      ? 'bg-secondary text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.glyph ? <Glyph kind={item.glyph} size={18} /> : item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : null}
                  {!compact && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const account = (compact = false) => (
    <div className="border-t border-border p-3">
      {!compact && (
        <div className="mb-3 min-w-0 rounded-lg border border-border px-3 py-2.5">
          <p className="truncate text-xs font-semibold">{user.name || 'Admin'}</p>
          <p className="mt-1 truncate text-2xs text-muted-foreground">{user.email}</p>
        </div>
      )}
      <div className={cn('flex items-center', compact ? 'flex-col gap-1' : 'justify-between')}>
        <ThemeToggle />
        <Button variant="ghost" size={compact ? 'icon' : 'sm'} onClick={() => signOut()} className="text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" />{!compact && <span className="ml-2">Sign out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex', collapsed ? 'w-[76px]' : 'w-[268px]')}>
        <div className={cn('flex h-20 items-center border-b border-border', collapsed ? 'justify-center px-3' : 'px-5')}>
          <Brand compact={collapsed} />
        </div>
        {navigation(collapsed)}
        {account(collapsed)}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand dashboard sidebar' : 'Collapse dashboard sidebar'}
          className="absolute -right-3 top-7 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <Brand />
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open dashboard navigation" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card">
          <Menu className="h-4 w-4" />
        </button>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close dashboard navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/35 lg:hidden"
            />
            <motion.aside
              role="dialog"
              aria-label="Dashboard navigation"
              aria-modal="true"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-border bg-card shadow-overlay lg:hidden"
            >
              <div className="flex h-20 items-center justify-between border-b border-border px-5">
                <Brand />
                <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close dashboard navigation" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
              </div>
              {navigation()}
              {account()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
