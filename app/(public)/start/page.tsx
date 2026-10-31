import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Section';
import { postIconFor, SiteIcon, SiteIconCell } from '@/components/ui/SiteIcon';
import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import { Post } from '@/lib/models/Post';
import { Series } from '@/lib/models/Series';
import { livePostFilter } from '@/lib/utils/post-visibility';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Where to start',
  description: 'New to AI? Pick a path. Each one is a few short articles to read in order, then a course if you want to go further.',
  alternates: { canonical: '/start' },
};

type SeriesRow = { _id: { toString(): string }; title: string; slug: string; description?: string; createdAt: Date };
type PartRow = {
  _id: { toString(): string };
  title: string;
  slug: string;
  readingTime?: number;
  views?: number;
  seriesId?: { toString(): string };
  seriesPart?: number;
  publishedAt?: Date;
  createdAt: Date;
};
type CourseRow = { title: string; slug: string; topic?: string; tags?: string[] };

type LearningPath = {
  id: string;
  title: string;
  slug: string;
  description: string;
  steps: Array<{ id: string; title: string; slug: string; readingTime?: number }>;
  totalMinutes: number;
  totalViews: number;
  newest: number;
  course: CourseRow | null;
};

// Words too common to say two things are about the same topic.
const STOP_WORDS = new Set([
  'about', 'all', 'and', 'are', 'basics', 'beginner', 'beginners', 'but', 'can', 'course', 'does', 'explained', 'for', 'from',
  'guide', 'how', 'into', 'its', 'learn', 'more', 'new', 'not', 'one', 'our', 'part', 'parts', 'really', 'series', 'simple',
  'simply', 'step', 'steps', 'that', 'the', 'their', 'them', 'then', 'this', 'what', 'when', 'why', 'with', 'work', 'works',
  'you', 'your',
]);

function keywords(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
  );
}

/** The published course sharing the most topic words with the series, or null when none share any. */
function bestCourseFor(series: SeriesRow, courses: CourseRow[]) {
  const seriesWords = keywords(`${series.title} ${series.description ?? ''}`);
  let best: CourseRow | null = null;
  let bestScore = 0;
  for (const course of courses) {
    const courseWords = keywords([course.title, course.topic ?? '', ...(course.tags ?? [])].join(' '));
    let score = 0;
    courseWords.forEach((word) => {
      if (seriesWords.has(word)) score += 1;
    });
    // Courses arrive featured-first, so a tie keeps the featured one.
    if (score > bestScore) {
      best = course;
      bestScore = score;
    }
  }
  return best;
}

function truncate(text: string, max = 140) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

async function getPaths(): Promise<{ paths: LearningPath[]; categories: string[] }> {
  await connectDB();
  // One round trip for everything: the database can be far from the server.
  const [series, parts, courses, categories] = await Promise.all([
    Series.find({ published: true }).select('title slug description createdAt').lean<SeriesRow[]>(),
    // Only live posts: drafts, scheduled and trashed parts never show here, not even as "coming soon".
    Post.find({ ...livePostFilter(), seriesId: { $ne: null } })
      .select('title slug readingTime views seriesId seriesPart publishedAt createdAt')
      .lean<PartRow[]>(),
    Course.find({ status: 'published' })
      .select('title slug topic tags')
      .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
      .lean<CourseRow[]>(),
    Post.distinct('category', livePostFilter()),
  ]);

  // seriesId may be stored as a string or an ObjectId, so compare as strings.
  const partsBySeries = new Map<string, PartRow[]>();
  for (const part of parts) {
    const key = part.seriesId?.toString();
    if (!key) continue;
    partsBySeries.set(key, [...(partsBySeries.get(key) ?? []), part]);
  }

  const paths = series
    .map((s): LearningPath | null => {
      const seriesParts = (partsBySeries.get(s._id.toString()) ?? []).sort((a, b) => {
        const byPart = (a.seriesPart ?? Number.MAX_SAFE_INTEGER) - (b.seriesPart ?? Number.MAX_SAFE_INTEGER);
        if (byPart !== 0) return byPart;
        return new Date(a.publishedAt ?? a.createdAt).getTime() - new Date(b.publishedAt ?? b.createdAt).getTime();
      });
      if (!seriesParts.length) return null;
      return {
        id: s._id.toString(),
        title: s.title,
        slug: s.slug,
        description: truncate(s.description?.trim() ?? ''),
        steps: seriesParts.map((p) => ({ id: p._id.toString(), title: p.title, slug: p.slug, readingTime: p.readingTime })),
        totalMinutes: seriesParts.reduce((acc, p) => acc + (p.readingTime ?? 0), 0),
        totalViews: seriesParts.reduce((acc, p) => acc + (p.views ?? 0), 0),
        newest: Math.max(...seriesParts.map((p) => new Date(p.publishedAt ?? p.createdAt).getTime())),
        course: bestCourseFor(s, courses),
      };
    })
    .filter((path): path is LearningPath => path !== null)
    .sort((a, b) => b.newest - a.newest);

  return {
    paths,
    categories: (categories as unknown[])
      .filter((category): category is string => typeof category === 'string' && category.length > 0)
      .sort((a, b) => a.localeCompare(b)),
  };
}

/** The most-read path, or the newest one while nothing has been read yet. Paths are already newest first. */
function pickStarter(paths: LearningPath[]) {
  return paths.reduce<LearningPath | null>((best, path) => (!best || path.totalViews > best.totalViews ? path : best), null);
}

export default async function StartPage() {
  let paths: LearningPath[] = [];
  let categories: string[] = [];
  try {
    ({ paths, categories } = await getPaths());
  } catch (error) {
    console.error('Failed to load learning paths', error);
  }
  const starter = pickStarter(paths);

  return (
    <div className="pb-24">
      <section className="border-b border-border py-12 sm:py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="text-eyebrow text-primary">Where to start</p>
              <h1 className="mt-3 text-title">New to AI? Pick a path.</h1>
              <p className="mt-4 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
                Each one is a few short articles in order, then a course if you want to go further.
              </p>
            </div>
            <SiteIconCell kind="learning" iconSize={96} className="hidden h-[180px] w-[180px] rounded-3xl border border-border lg:flex" />
          </div>

          {starter ? (
            <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-primary/40 bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-start gap-4">
                <SiteIcon kind={postIconFor(`${starter.title} ${starter.description}`)} size={40} className="mt-1 text-foreground" />
                <div className="min-w-0">
                  <p className="font-mono text-[12px] tracking-[0.06em] text-primary">NOT SURE? START HERE</p>
                  <p className="mt-1.5 font-serif text-[22px] font-medium leading-[1.2] tracking-[-0.01em] sm:text-2xl">{starter.title}</p>
                  <p className="mt-1.5 text-[15px] leading-[1.6] text-muted-foreground">
                    Step 1: {starter.steps[0].title}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button asChild>
                  <Link href={`/blog/${starter.steps[0].slug}`}>Read step 1</Link>
                </Button>
                <a href={`#path-${starter.slug}`} className="text-center text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 sm:text-right">
                  See the whole path
                </a>
              </div>
            </div>
          ) : null}
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        {paths.length ? (
          <div className="flex flex-col">
            {paths.map((path, pathIndex) => (
              <section
                key={path.id}
                id={`path-${path.slug}`}
                aria-labelledby={`path-${path.slug}-title`}
                className="grid scroll-mt-24 gap-8 border-b border-border py-10 first:pt-0 last:border-b-0 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-14"
              >
                <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
                  <SiteIconCell kind={postIconFor(`${path.title} ${path.description}`)} iconSize={44} className="h-20 w-20 rounded-xl border border-border" />
                  <p className="font-mono text-[12px] tracking-[0.06em] text-primary">
                    PATH {pathIndex + 1} · {path.steps.length} {path.steps.length === 1 ? 'STEP' : 'STEPS'}
                    {path.totalMinutes ? ` · ABOUT ${path.totalMinutes} MIN` : ''}
                  </p>
                  <h2 id={`path-${path.slug}-title`} className="font-serif text-[26px] font-medium leading-[1.15] tracking-[-0.01em] sm:text-[30px]">
                    {path.title}
                  </h2>
                  {path.description ? <p className="line-clamp-3 text-[15px] leading-[1.6] text-muted-foreground">{path.description}</p> : null}
                  <Link href={`/blog/series/${path.slug}`} className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">
                    About this series
                  </Link>
                </div>

                <ol className="flex flex-col" aria-label={`Steps in ${path.title}`}>
                  {path.steps.map((step, index) => {
                    const last = index === path.steps.length - 1 && !path.course;
                    return (
                      <li key={step.id} className="relative pb-6 pl-14 last:pb-0">
                        {last ? null : <span aria-hidden="true" className="absolute bottom-0 left-[19px] top-10 w-0.5 bg-border" />}
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-background font-mono text-[15px] font-medium"
                        >
                          {index + 1}
                        </span>
                        <Link href={`/blog/${step.slug}`} className="group block rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-foreground/40 sm:px-5">
                          <span className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
                            STEP {index + 1}
                            {step.readingTime ? ` · ${step.readingTime} MIN READ` : ''}
                          </span>
                          <span className="mt-1 block font-serif text-[19px] font-medium leading-[1.25] group-hover:text-primary sm:text-xl">{step.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {path.course ? (
                    <li className="relative pl-14">
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background text-primary"
                      >
                        <SiteIcon kind="courses" size={22} accent={false} />
                      </span>
                      <Link href={`/courses/${path.course.slug}`} className="group block rounded-xl border border-dashed border-primary/50 px-4 py-3.5 transition-colors hover:border-primary sm:px-5">
                        <span className="font-mono text-[12px] tracking-[0.06em] text-primary">GO FURTHER · COURSE</span>
                        <span className="mt-1 block font-serif text-[19px] font-medium leading-[1.25] group-hover:text-primary sm:text-xl">{path.course.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">Short lessons with videos and quick quizzes.</span>
                      </Link>
                    </li>
                  ) : null}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-serif text-xl font-medium">Paths are on their way.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              For now, start with the <Link href="/blog" className="underline decoration-primary decoration-2 underline-offset-4">articles</Link> or the{' '}
              <Link href="/courses" className="underline decoration-primary decoration-2 underline-offset-4">courses</Link>.
            </p>
          </div>
        )}

        <section aria-labelledby="browse-title" className="mt-14 border-t border-border pt-10">
          <p className="text-eyebrow text-primary">Or browse by topic</p>
          <h2 id="browse-title" className="mt-2 font-serif text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-[-0.02em]">
            Rather look around?
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {categories.map((category) => (
              <li key={category}>
                <Link
                  href={`/blog?category=${encodeURIComponent(category)}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] font-medium transition-colors hover:border-foreground/40 hover:text-primary"
                >
                  <SiteIcon kind={postIconFor(category)} size={20} />
                  {category}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/blog" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] font-medium transition-colors hover:border-foreground/40 hover:text-primary">
                <SiteIcon kind="articles" size={20} />
                All articles
              </Link>
            </li>
            <li>
              <Link href="/courses" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] font-medium transition-colors hover:border-foreground/40 hover:text-primary">
                <SiteIcon kind="courses" size={20} />
                All courses
              </Link>
            </li>
          </ul>
        </section>
      </Container>
    </div>
  );
}
