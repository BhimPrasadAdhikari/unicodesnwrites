import type { Metadata } from 'next';
import Link from 'next/link';

import { Glyph, type GlyphKind } from '@/components/ui/Glyph';
import { Container } from '@/components/ui/Section';
import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import { Post } from '@/lib/models/Post';
import Product from '@/lib/models/Product';
import { Project } from '@/lib/models/Project';
import { livePostFilter } from '@/lib/utils/post-visibility';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q.slice(0, 60)}` : 'Search',
    alternates: { canonical: '/search' },
    // Result pages are thin and endless; keep them out of the index.
    robots: { index: false, follow: true },
  };
}

type Hit = { kind: GlyphKind; label: string; title: string; summary?: string; href: string };

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function search(term: string): Promise<Hit[]> {
  const pattern = { $regex: escapeRegex(term), $options: 'i' };
  await connectDB();
  const [posts, courses, products, projects] = await Promise.all([
    Post.find({ ...livePostFilter(), $or: [{ title: pattern }, { excerpt: pattern }, { tags: pattern }, { category: pattern }] })
      .sort({ publishedAt: -1 })
      .limit(20)
      .select('title slug excerpt category')
      .lean<Array<{ title: string; slug: string; excerpt?: string; category?: string }>>(),
    Course.find({ status: 'published', $or: [{ title: pattern }, { summary: pattern }, { topic: pattern }] })
      .limit(10)
      .select('title slug summary')
      .lean<Array<{ title: string; slug: string; summary?: string }>>(),
    Product.find({ published: true, $or: [{ title: pattern }, { shortDescription: pattern }, { tags: pattern }, { category: pattern }] })
      .limit(10)
      .select('title slug shortDescription')
      .lean<Array<{ title: string; slug: string; shortDescription?: string }>>(),
    Project.find({ published: true, $or: [{ title: pattern }, { shortDescription: pattern }, { techStack: pattern }] })
      .limit(10)
      .select('title slug shortDescription')
      .lean<Array<{ title: string; slug: string; shortDescription?: string }>>(),
  ]);

  return [
    ...posts.map((post) => ({ kind: 'papers' as const, label: post.category || 'Writing', title: post.title, summary: post.excerpt, href: `/blog/${post.slug}` })),
    ...courses.map((course) => ({ kind: 'courses' as const, label: 'Course', title: course.title, summary: course.summary, href: `/courses/${course.slug}` })),
    ...products.map((product) => ({ kind: 'tools' as const, label: 'Tool', title: product.title, summary: product.shortDescription, href: `/products/${product.slug}` })),
    ...projects.map((project) => ({ kind: 'builds' as const, label: 'Build', title: project.title, summary: project.shortDescription, href: `/projects/${project.slug}` })),
  ];
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = (q || '').trim().slice(0, 100);
  let hits: Hit[] = [];
  let failed = false;
  if (term.length >= 2) {
    try {
      hits = await search(term);
    } catch (error) {
      console.error('Search failed', error);
      failed = true;
    }
  }

  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <p className="text-eyebrow text-primary">§ Search</p>
      <h1 className="mt-3 text-title">Find anything in the notebook.</h1>

      <form action="/search" role="search" className="mt-8 flex gap-2">
        <label htmlFor="site-search" className="sr-only">Search posts, courses, tools and builds</label>
        <input
          id="site-search"
          name="q"
          type="search"
          defaultValue={term}
          autoFocus={!term}
          placeholder="Try “attention”, “agents” or “entropy”"
          className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-card px-4 text-[16px]"
        />
        <button type="submit" className="h-12 rounded-lg bg-foreground px-5 text-[15px] font-medium text-background hover:bg-foreground/90">Search</button>
      </form>

      {failed ? (
        <p className="mt-10 text-muted-foreground">Search is unavailable right now. Try again in a moment.</p>
      ) : term.length >= 2 ? (
        <section aria-live="polite" className="mt-10">
          <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
            {hits.length} {hits.length === 1 ? 'result' : 'results'} for “{term}”
          </p>
          {hits.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {hits.map((hit) => (
                <li key={hit.href}>
                  <Link href={hit.href} className="group flex gap-4 py-5">
                    <Glyph kind={hit.kind} size={22} className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary" />
                    <span className="min-w-0">
                      <span className="block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{hit.label}</span>
                      <span className="mt-1 block font-serif text-xl font-medium leading-snug group-hover:text-primary">{hit.title}</span>
                      {hit.summary ? <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{hit.summary}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">
              Nothing matched. Try a broader word, or browse <Link href="/blog" className="underline decoration-primary decoration-2 underline-offset-4">all writing</Link>.
            </p>
          )}
        </section>
      ) : null}
    </Container>
  );
}
