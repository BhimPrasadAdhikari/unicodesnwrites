import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { connectDB } from '@/lib/db/connection';
import { Series } from '@/lib/models/Series';
import { Post, IPost } from '@/lib/models/Post';
import { User } from '@/lib/models/User';
import { Section, Container } from '@/components/ui/Section';
import SeriesProgressSummary from '@/components/public/SeriesProgressSummary';
import SeriesPartCompletion from '@/components/public/SeriesPartCompletion';
import { GlyphCell, GLYPHS, glyphFor } from '@/components/ui/Glyph';
import { format } from 'date-fns';
import { livePostFilter } from '@/lib/utils/post-visibility';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { title: 'Series Not Found' };
  await connectDB();
  const series = await Series.findOne({ slug, published: true }).lean();
  if (!series) return { title: 'Series Not Found' };

  return {
    title: `${series.title} | Series | unicodesnwrites`,
    description: series.description ?? `A multi-part series: ${series.title}`,
    openGraph: {
      title: series.title,
      description: series.description,
      images: series.coverImage ? [series.coverImage] : [],
    },
  };
}

export default async function SeriesHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  await connectDB();

  const series = await Series.findOne({ slug, published: true }).lean();
  if (!series) notFound();

  const seriesIdStr = series._id.toString();

  // Fetch ALL published posts, then filter by seriesId using string comparison
  // (seriesId may be stored as string or ObjectId depending on when it was saved)
  const allPublishedPosts = (await Post.find(livePostFilter())
    .sort({ seriesPart: 1 })
    .populate({ path: 'author', model: User, select: 'name' })
    .lean()) as unknown as IPost[];

  const posts = allPublishedPosts.filter(
    (p) => p.seriesId && p.seriesId.toString() === seriesIdStr
  );

  const kind = glyphFor(`${series.title} ${series.description ?? ''}`);
  const totalReadingTime = posts.reduce((acc, p) => acc + (p.readingTime ?? 0), 0);

  return (
    <div className="min-h-screen">
      <Section className="pb-20 pt-12 md:pt-16">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
            <Link href="/blog" className="inline-flex min-h-11 items-center hover:text-foreground">WRITING</Link>
            <span aria-hidden="true"> / </span>
            <span>SERIES</span>
          </nav>

          <div className="mb-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="max-w-3xl">
              <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.06em] text-primary">
                Series · {GLYPHS[kind].name} · {posts.length} {posts.length === 1 ? 'part' : 'parts'}
              </p>
              <h1 className="text-title text-foreground">{series.title}</h1>
              {series.description && (
                <p className="mt-5 font-serif text-[19px] leading-[1.55] text-muted-foreground sm:text-[21px]">{series.description}</p>
              )}
              <p className="mt-6 border-t border-border pt-4 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                ~{totalReadingTime} min total
                {posts[0]?.publishedAt ? ` · started ${format(new Date(posts[0].publishedAt), 'MMM yyyy')}` : ''}
              </p>
              <SeriesProgressSummary postSlugs={posts.map((post) => post.slug)} />
            </div>
            <div className="relative hidden aspect-square overflow-hidden rounded-3xl border border-border lg:block">
              {series.coverImage ? (
                <Image src={series.coverImage} alt="" fill sizes="220px" className="object-cover" priority />
              ) : (
                <GlyphCell kind={kind} glyphSize={110} className="absolute inset-0" />
              )}
            </div>
          </div>

          <ol className="max-w-3xl border-t border-border">
            {posts.map((post, index) => {
              const partNum = post.seriesPart ?? index + 1;
              return (
                <li key={post._id.toString()}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-b border-border py-6 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-5"
                  >
                    <span className="font-mono text-[15px] text-muted-foreground sm:text-lg">{String(partNum).padStart(2, '0')}</span>
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="font-serif text-[21px] font-medium leading-[1.2] tracking-[-0.01em] group-hover:text-primary sm:text-2xl">{post.title}</span>
                      {post.excerpt ? <span className="line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">{post.excerpt}</span> : null}
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                        {post.readingTime ? <span>{post.readingTime} min</span> : null}
                        {post.publishedAt ? <span>· {format(new Date(post.publishedAt), 'MMM d, yyyy')}</span> : null}
                        <SeriesPartCompletion postSlug={post.slug} />
                      </span>
                    </span>
                    <span className="col-start-2 text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 sm:col-start-auto sm:self-center">
                      Read
                    </span>
                  </Link>
                </li>
              );
            })}
            {posts.length === 0 && (
              <li className="mt-6 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <p className="font-serif text-xl font-medium">This series is being assembled.</p>
                <p className="mt-2 text-sm text-muted-foreground">Published parts will appear here in reading order.</p>
              </li>
            )}
          </ol>
        </Container>
      </Section>
    </div>
  );
}
