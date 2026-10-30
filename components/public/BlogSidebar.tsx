'use client';

import { useMemo, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import NewsletterSignupForm from '@/components/public/NewsletterSignupForm';

interface BlogSidebarProps {
  categories: string[];
}

const buildSearchParams = (current: URLSearchParams, updates: Record<string, string | undefined>) => {
  const next = new URLSearchParams(current.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  });
  return next;
};

export default function BlogSidebar({ categories }: BlogSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get('q') || searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  const categoryList = useMemo(
    () => categories.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [categories]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = buildSearchParams(searchParams, {
      q: query.trim() || undefined,
      page: undefined,
    });
    router.push(`/blog?${next.toString()}`);
  };

  const handleCategorySelect = (category?: string) => {
    const next = buildSearchParams(searchParams, {
      category: category || undefined,
      page: undefined,
    });
    router.push(`/blog${next.toString() ? `?${next.toString()}` : ''}`);
  };

  return (
    <aside className="space-y-6">
      <div className="space-y-3">
        <h3 className="mb-3 text-eyebrow text-muted-foreground">Search</h3>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2 border-b border-border bg-transparent text-sm focus:outline-none focus:border-foreground transition-colors"
            aria-label="Search articles"
          />
          <Search className="absolute left-0 top-2.5 h-4 w-4 text-muted-foreground" />
        </form>
      </div>

      <NewsletterSignupForm source="blog-sidebar" variant="minimal" />

      <div className="space-y-3">
        <h3 className="mb-3 text-eyebrow text-muted-foreground">Topics</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => handleCategorySelect()}
            className={`min-h-11 text-sm font-medium transition-colors border-b-2 py-1 ${
              !currentCategory
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            All
          </button>
          {categoryList.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleCategorySelect(tag)}
              className={`min-h-11 text-sm font-medium transition-colors border-b-2 py-1 ${
                currentCategory === tag
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
