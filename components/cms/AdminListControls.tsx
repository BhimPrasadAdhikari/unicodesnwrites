import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cn } from '@/lib/utils';

type Params = Record<string, string | undefined>;

function hrefWith(base: string, params: Params, changes: Params) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `${base}?${query}` : base;
}

/** Filter tabs that keep the other query params (search) and reset paging. */
export function FilterTabs({
  base,
  params,
  name,
  options,
}: {
  base: string;
  params: Params;
  name: string;
  options: { value: string; label: string; count?: number }[];
}) {
  const current = params[name] || '';
  return (
    <nav aria-label="Filter" className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = current === option.value;
        return (
          <Link
            key={option.value || 'all'}
            href={hrefWith(base, params, { [name]: option.value || undefined, page: undefined })}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
              active ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? <span className="font-mono text-[11px] opacity-70">{option.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** A GET search box; works without JavaScript. */
export function SearchBox({ base, params, placeholder }: { base: string; params: Params; placeholder: string }) {
  return (
    <form action={base} className="flex gap-2">
      {Object.entries(params)
        .filter(([key, value]) => value && key !== 'q' && key !== 'page')
        .map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <label htmlFor="admin-search" className="sr-only">Search</label>
      <input
        id="admin-search"
        name="q"
        defaultValue={params.q || ''}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm sm:w-72"
      />
      <button type="submit" className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:border-foreground/40">Search</button>
    </form>
  );
}

export function Pager({ base, params, page, totalPages }: { base: string; params: Params; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={hrefWith(base, params, { page: String(page - 1) })} className="min-h-10 rounded-lg border border-border px-4 py-2 hover:border-foreground/40">← Previous</Link>
      ) : <span />}
      <span className="font-mono text-[12px] text-muted-foreground">Page {page} of {totalPages}</span>
      {page < totalPages ? (
        <Link href={hrefWith(base, params, { page: String(page + 1) })} className="min-h-10 rounded-lg border border-border px-4 py-2 hover:border-foreground/40">Next →</Link>
      ) : <span />}
    </nav>
  );
}

export function parsePage(value: string | undefined) {
  const page = Number.parseInt(value || '1', 10);
  return Number.isFinite(page) ? Math.min(Math.max(page, 1), 10_000) : 1;
}

/** A page number past the end (e.g. after deleting the last rows) goes to the last page instead of an empty list. */
export function redirectPastLastPage(base: string, params: Params, page: number, totalPages: number) {
  if (totalPages > 0 && page > totalPages) {
    redirect(hrefWith(base, params, { page: totalPages > 1 ? String(totalPages) : undefined }));
  }
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
