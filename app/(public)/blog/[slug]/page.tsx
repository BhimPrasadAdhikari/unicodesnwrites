import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import { Post, IPost } from '@/lib/models/Post';
import { Series } from '@/lib/models/Series';
import { User } from '@/lib/models/User';
import BlogContent from '@/components/public/BlogContent';
import SeriesNav from '@/components/public/SeriesNav';
import BlogReadingProgress from '@/components/public/BlogReadingProgress';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { Metadata } from 'next';
import Image from 'next/image';
import { formatDistanceToNow, format } from 'date-fns';
import BlogPostEndCTA from '@/components/public/BlogPostEndCTA';
import RelatedPosts from '@/components/public/RelatedPosts';
import ArticleSummaryCard from '@/components/public/ArticleSummaryCard';
import BlogTableOfContents from '@/components/public/BlogTableOfContents';
import BlogPromptNavigator from '@/components/public/BlogPromptNavigator';
import Link from 'next/link';
import { extractMarkdownHeadings } from '@/lib/utils/toc-headings';
import { siteConfig } from '@/lib/config/site.config';
import { livePostFilter } from '@/lib/utils/post-visibility';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const post = await Post.findOne({ slug, ...livePostFilter() }).lean() as unknown as IPost;

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    keywords: post.seoKeywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      url: `/blog/${post.slug}`,
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectDB();
  
  const post = await Post.findOne({ slug, ...livePostFilter() })
    .populate({
      path: 'author',
      model: User,
      select: 'name'
    })
    .lean() as unknown as IPost;

  if (!post) {
    notFound();
  }

  // Increment view count
  await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

  const authorName = post.author && typeof post.author === 'object' && 'name' in post.author && post.author.name
    ? post.author.name
    : 'Author';

  // ── Series data (only when post is part of a series) ──────────────────────
  let seriesData: {
    title: string;
    slug: string;
    totalParts: number;
    currentPart: number;
    prevPost: { slug: string; title: string } | null;
    nextPost: { slug: string; title: string } | null;
    postSlugs: string[];
  } | null = null;

  if (post.seriesId) {
    const postSeriesIdStr = post.seriesId.toString();

    // Find the series — try findById first, fall back to string match
    let series = await Series.findById(post.seriesId).lean();
    if (!series) {
      // seriesId might be stored as string; find by comparing toString()
      const allSeries = await Series.find().lean();
      series = allSeries.find((s) => s._id.toString() === postSeriesIdStr) ?? null;
    }

    // Find sibling posts using JS string comparison
    const allPublished = await Post.find(livePostFilter())
      .sort({ seriesPart: 1 })
      .select('slug title seriesPart seriesId')
      .lean() as unknown as IPost[];

    const siblingPosts = allPublished.filter(
      (p) => p.seriesId && p.seriesId.toString() === postSeriesIdStr
    );

    if (series && siblingPosts.length > 0) {
      const currentIndex = siblingPosts.findIndex((p) => p.slug === slug);
      const currentPart = post.seriesPart ?? currentIndex + 1;
      seriesData = {
        title: series.title,
        slug: series.slug,
        totalParts: siblingPosts.length,
        currentPart,
        prevPost: currentIndex > 0
          ? { slug: siblingPosts[currentIndex - 1].slug, title: siblingPosts[currentIndex - 1].title }
          : null,
        nextPost: currentIndex < siblingPosts.length - 1
          ? { slug: siblingPosts[currentIndex + 1].slug, title: siblingPosts[currentIndex + 1].title }
          : null,
        postSlugs: siblingPosts.map((item) => item.slug),
      };
    }
  }

  const tocHeadings = extractMarkdownHeadings(post.content);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: `https://${siteConfig.domain}/blog/${post.slug}`,
    image: post.coverImage || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: { '@type': 'Person', name: authorName },
    publisher: { '@type': 'Person', name: siteConfig.author.name },
    keywords: post.tags?.join(', '),
    inLanguage: 'en',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <section className="w-full px-6 pb-16 pt-8 sm:pt-12 md:px-8 lg:px-10 xl:px-12">
        <BlogTableOfContents headings={tocHeadings} variant="mobile" />
        <div className="relative mx-auto flex w-full max-w-[820px]">
          {/* Scrollable fixed-height Table of Contents — positioned vertically centered just left of the blog content */}
          <aside className="hidden xl:block absolute right-full mr-6 2xl:mr-10 top-0 h-full pointer-events-none">
            <div className="sticky top-1/2 -translate-y-1/2 pointer-events-auto">
              <BlogPromptNavigator headings={tocHeadings} />
            </div>
          </aside>

          <article id="blog-post-shell" className="mx-auto min-w-0 max-w-[820px] flex-1">
            <AnalyticsTracker
              event="blog_view"
              metadata={{
                postId: post._id.toString(),
                title: post.title,
                category: post.category,
              }}
            />

            {/* Header */}
            <header className="mb-10 sm:mb-12">
              <p className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                <span className="text-primary">{post.category}</span>
                {seriesData ? <><span aria-hidden="true">·</span><span>Part {seriesData.currentPart} of {seriesData.totalParts}</span></> : null}
                <span aria-hidden="true">·</span>
                <span>{post.readingTime} min</span>
                <span aria-hidden="true">·</span>
                <span>{(post.views || 0) + 1} views</span>
              </p>

              <h1 className="mb-5 font-serif text-[clamp(2.125rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.025em]">
                {post.title}
              </h1>

              {post.excerpt ? (
                <p className="mb-6 max-w-[760px] font-serif text-[19px] leading-[1.5] text-muted-foreground sm:text-[22px]">{post.excerpt}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{authorName}</span>
                {post.publishedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={new Date(post.publishedAt).toISOString()}>
                      {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                    </time>
                    <span className="hidden text-muted-foreground/70 sm:inline">
                      ({formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })})
                    </span>
                  </>
                )}
              </div>
            </header>

            {/* Cover Image */}
            {post.coverImage && (
              <div className="relative mb-12 aspect-[2/1] w-full overflow-hidden rounded-xl border border-border">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Content */}
            {/* Series navigation banner — shown when this post belongs to a series */}
            {seriesData && (
              <SeriesNav
                seriesTitle={seriesData.title}
                seriesSlug={seriesData.slug}
                currentPart={seriesData.currentPart}
                totalParts={seriesData.totalParts}
                prevPost={seriesData.prevPost}
                nextPost={seriesData.nextPost}
                seriesPostSlugs={seriesData.postSlugs}
                currentPostSlug={post.slug}
              />
            )}

            <ArticleSummaryCard postSlug={post.slug} />

            <BlogContent
              content={post.content}
              readingTime={post.readingTime}
              storageKey={post.slug}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 border-t border-border pt-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-eyebrow text-muted-foreground mr-2">Tags</span>
                  {post.tags.map((tag: string) => (
                    <Link
                      key={tag}
                      href={`/blog?q=${encodeURIComponent(tag)}`}
                      className="inline-flex min-h-9 items-center rounded-md border border-border px-2.5 font-mono text-[12px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <BlogReadingProgress postSlug={post.slug} readingTime={post.readingTime} />

            {/* Newsletter CTA */}
            <BlogPostEndCTA />
          </article>
        </div>
      </section>

      <RelatedPosts
        currentPostSlug={post.slug}
        category={post.category}
        tags={Array.isArray(post.tags) ? post.tags : []}
        seriesId={post.seriesId ? post.seriesId.toString() : undefined}
        currentPostId={post._id ? post._id.toString() : undefined}
        currentTitle={post.title}
      />
    </>
  );
}

