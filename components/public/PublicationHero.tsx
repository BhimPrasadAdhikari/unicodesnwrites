import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Section';
import { GlyphCell, glyphFor, GLYPHS } from '@/components/ui/Glyph';
import { connectDB } from '@/lib/db/connection';
import { Post } from '@/lib/models/Post';
import { Series } from '@/lib/models/Series';
import { livePostFilter } from '@/lib/utils/post-visibility';

type DeskPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime?: number;
  seriesPart?: number;
  seriesTotal?: number;
};

async function getDeskPost(): Promise<DeskPost | null> {
  try {
    await connectDB();
    const post = await Post.findOne(livePostFilter())
      .sort({ publishedAt: -1 })
      .select('slug title excerpt category readingTime seriesId seriesPart')
      .lean();
    if (!post) return null;
    let seriesTotal: number | undefined;
    if (post.seriesId && (await Series.exists({ _id: post.seriesId }))) {
      seriesTotal = await Post.countDocuments({ ...livePostFilter(), seriesId: post.seriesId });
    }
    return JSON.parse(JSON.stringify({ ...post, seriesTotal }));
  } catch (error) {
    console.error('Failed to fetch the latest post for the hero', error);
    return null;
  }
}

export async function PublicationHero() {
  const desk = await getDeskPost();
  const kind = glyphFor(desk?.category);
  const deskLabel = [
    GLYPHS[kind].name.toUpperCase(),
    desk?.seriesPart && desk.seriesTotal ? `PART ${desk.seriesPart} OF ${desk.seriesTotal}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <section className="border-b border-border">
      <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:gap-14 lg:py-[72px]">
        <div className="flex flex-col gap-6 sm:gap-7">
          <p className="text-eyebrow text-primary">A research notebook by Bhim Prasad Adhikari</p>
          <h1 className="font-serif text-[clamp(2.5rem,6vw,4.75rem)] font-medium leading-[0.98] tracking-[-0.025em] text-foreground">
            I take AI papers apart, build the agents, and <span className="hl">write down everything</span>.
          </h1>
          <p className="max-w-[560px] text-[17px] leading-[1.6] text-muted-foreground sm:text-[19px]">
            Paper dissections with the math derived from the ground up, autonomous agents built in the open, ML projects shipped end to end, plus the courses and tools that come out of them.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={desk ? `/blog/${desk.slug}` : '/blog'}>Read the latest dissection</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
        </div>

        {desk ? (
          <Link
            href={`/blog/${desk.slug}`}
            className="group block rounded-3xl border border-border bg-card p-5 shadow-[0_30px_60px_-40px_rgba(17,18,20,0.35)] transition-colors hover:border-foreground/40 sm:p-7"
          >
            <div className="flex justify-between gap-3 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
              <span>ON THE DESK</span>
              <span className="truncate">{deskLabel}</span>
            </div>
            <div className="mt-4 flex items-center gap-4 sm:gap-6">
              <GlyphCell kind={kind} label={false} glyphSize={56} className="h-20 w-20 shrink-0 rounded-xl border border-border sm:h-[120px] sm:w-[120px] sm:rounded-xl [&>svg]:h-11 [&>svg]:w-11 sm:[&>svg]:h-16 sm:[&>svg]:w-16" />
              <span className="font-serif text-[22px] font-medium leading-[1.15] tracking-[-0.01em] group-hover:text-primary sm:text-[30px] sm:leading-[1.12]">
                {desk.title}
              </span>
            </div>
            {desk.excerpt ? (
              <p className="mt-5 line-clamp-3 font-serif text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">{desk.excerpt}</p>
            ) : null}
            <div className="mt-5 flex items-end justify-end">
              <span className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4">
                Continue reading{desk.readingTime ? ` · ${desk.readingTime} min` : ''}
              </span>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-7">
            <p className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">ON THE DESK</p>
            <p className="mt-4 font-serif text-[26px] font-medium leading-[1.15]">The next dissection is being written.</p>
            <p className="pen-note mt-5">subscribe to Letters to get it first</p>
          </div>
        )}
      </Container>
    </section>
  );
}
