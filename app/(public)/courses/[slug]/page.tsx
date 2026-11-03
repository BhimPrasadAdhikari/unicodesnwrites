import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, CheckCircle2, ChevronDown, FileText, PlayCircle, Users } from 'lucide-react';

import { Container } from '@/components/ui/Section';
import { SiteIconCell } from '@/components/ui/SiteIcon';
import { getPublishedCourseBySlug } from '@/lib/services/course-platform';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/config/auth';
import { getEnrollment } from '@/lib/services/course-enrollment';
import { CourseEnrollmentAction } from '@/components/public/CourseEnrollmentAction';
import { CourseTrailer } from '@/components/public/CourseTrailer';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { siteConfig } from '@/lib/config/site.config';

type PageProps = { params: Promise<{ slug: string }> };

function formatDuration(minutes: number) {
  return minutes < 90 ? `${minutes} min` : `${Math.round(minutes / 60)} hours`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course)
    return {
      title: 'Course not found',
      robots: { index: false, follow: false },
    };
  const canonical = `/courses/${course.slug}`;
  return {
    title: course.title,
    description: course.summary,
    keywords: [...course.tags, course.topic.replaceAll('-', ' '), 'AIML course', 'interactive AI learning'],
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: course.title,
      description: course.summary,
      images: course.coverImage ? [{ url: course.coverImage, alt: course.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description: course.summary,
      images: course.coverImage ? [course.coverImage] : undefined,
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();
  const session = await getServerSession(authOptions);
  const enrollment = session?.user?.id && session.user.role !== 'admin' ? await getEnrollment(session.user.id, slug) : null;
  const enrolled = session?.user.role === 'admin' || Boolean(enrollment?.enrollment);
  const completedSlugs = new Set<string>(enrollment?.enrollment?.completedLessonSlugs ?? []);
  const lessonOrder = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.slug));
  // Resume at the last lesson opened if it isn't finished, else the first unfinished one.
  const lastOpened = enrollment?.enrollment?.lastLessonSlug;
  const resumeLessonSlug =
    (lastOpened && lessonOrder.includes(lastOpened) && !completedSlugs.has(lastOpened) ? lastOpened : null) ??
    lessonOrder.find((lessonSlug) => !completedSlugs.has(lessonSlug)) ??
    course.firstLessonSlug;
  const firstLesson = course.modules.flatMap((module) => module.lessons)[0];
  // Open the part the learner is in; for a new learner, the first part.
  const openModuleKey =
    course.modules.find((module) => module.lessons.some((lesson) => lesson.slug === (enrolled ? resumeLessonSlug : course.firstLessonSlug)))?.key ??
    course.modules[0]?.key;
  const stats: Array<[string, string]> = [
    [String(course.lessonCount), 'Lessons'],
    [formatDuration(course.durationMinutes), 'To finish'],
    [String(course.quizCount), 'Quiz questions'],
  ];
  const enrollmentAction = course.firstLessonSlug ? (
    <CourseEnrollmentAction
      slug={course.slug}
      firstLessonSlug={enrolled ? resumeLessonSlug : course.firstLessonSlug}
      authenticated={Boolean(session?.user?.id)}
      verified={Boolean(session?.user?.emailVerified || session?.user?.role === 'admin')}
      enrolled={enrolled}
    />
  ) : null;
  const courseUrl = `https://${siteConfig.domain}/courses/${course.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.summary,
    url: courseUrl,
    image: course.coverImage || undefined,
    provider: {
      '@type': 'Person',
      name: course.instructorName,
      url: `https://${siteConfig.domain}/about`,
    },
    educationalLevel: course.level,
    about: course.topic.replaceAll('-', ' '),
    keywords: course.tags.join(', '),
    teaches: course.learningOutcomes,
    timeRequired: `PT${course.durationMinutes}M`,
    isAccessibleForFree: true,
    inLanguage: 'en',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${course.durationMinutes}M`,
      instructor: { '@type': 'Person', name: course.instructorName },
    },
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: courseUrl,
    },
  };

  return (
    <div className="pb-24">
      <AnalyticsTracker
        event="course_view"
        metadata={{
          courseId: course.id,
          slug: course.slug,
          topic: course.topic,
          level: course.level,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <section className="border-b border-border py-12 sm:py-16">
        <Container className="max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
            <div>
              <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                <span className="text-primary">Free course</span>
                <span aria-hidden="true">·</span>
                <span>{course.level}</span>
                <span aria-hidden="true">·</span>
                <span>{course.topic.replaceAll('-', ' ')}</span>
              </p>
              <h1 className="text-title">{course.title}</h1>
              <p className="mt-5 max-w-xl font-serif text-[19px] leading-[1.5] text-muted-foreground sm:text-[21px]">{course.summary}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {enrollmentAction}
                <a href="#curriculum" className="inline-flex h-12 items-center rounded-lg px-4 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  See the lessons
                </a>
              </div>
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
                {stats.map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-serif text-2xl font-medium leading-none">{value}</dd>
                    <dd className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-xs text-muted-foreground">Created and taught by {course.instructorName}</p>
            </div>

            {course.introVideoId ? (
              <CourseTrailer
                videoId={course.introVideoId}
                title={`${course.title}: trailer`}
                caption={firstLesson?.title || course.title}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <SiteIconCell kind="courses" label={`COURSE · ${course.level.toUpperCase()}`} iconSize={96} className="min-h-[240px]" />
              </div>
            )}
          </div>
        </Container>
      </section>

      <Container className="max-w-4xl space-y-20 py-16 sm:py-20">
        <section aria-labelledby="outcomes">
          <p className="text-eyebrow text-primary">What you will learn</p>
          <h2 id="outcomes" className="mt-2 font-serif text-3xl font-medium">By the end, you can</h2>
          <ul className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {course.learningOutcomes.map((outcome) => (
              <li key={outcome} className="flex gap-3 text-[15px] leading-6">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                {outcome}
              </li>
            ))}
          </ul>
        </section>

        <section id="curriculum" aria-labelledby="curriculum-title" className="scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow text-primary">Lessons</p>
              <h2 id="curriculum-title" className="mt-2 font-serif text-3xl font-medium">The course, part by part</h2>
            </div>
            <p className="font-mono text-[12px] text-muted-foreground">
              {course.modules.length} parts · {course.lessonCount} lessons · {formatDuration(course.durationMinutes)}
            </p>
          </div>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {course.modules.map((module, moduleIndex) => {
              const minutes = module.lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0);
              const done = module.lessons.filter((lesson) => completedSlugs.has(lesson.slug)).length;
              return (
                <details key={module.key} open={module.key === openModuleKey} className="group/module">
                  <summary className="flex cursor-pointer list-none items-start gap-4 py-5 [&::-webkit-details-marker]:hidden">
                    <span className="mt-0.5 w-8 shrink-0 font-mono text-[13px] text-muted-foreground">{String(moduleIndex + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-medium leading-snug">{module.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{module.description}</span>
                    </span>
                    <span className="hidden shrink-0 pt-1 text-right font-mono text-[12px] text-muted-foreground sm:block">
                      {enrolled && done ? `${done}/${module.lessons.length} done` : `${module.lessons.length} ${module.lessons.length === 1 ? 'lesson' : 'lessons'}`} · {minutes} min
                    </span>
                    <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition group-open/module:rotate-180" />
                  </summary>
                  <ol className="mb-5 ml-12 space-y-1">
                    {module.lessons.map((lesson) => {
                      const complete = completedSlugs.has(lesson.slug);
                      return (
                        <li key={lesson.key}>
                          <Link
                            href={`/courses/${course.slug}/learn/${lesson.slug}`}
                            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-secondary"
                          >
                            {complete ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Completed" />
                            ) : lesson.hasVideo ? (
                              <PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-label="Video lesson" />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-label="Reading lesson" />
                            )}
                            <span className="min-w-0 flex-1 text-[15px] group-hover:text-primary">{lesson.title}</span>
                            <span className="shrink-0 font-mono text-[12px] text-muted-foreground">{lesson.durationMinutes} min</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              );
            })}
          </div>
        </section>

        {course.audience.length || course.prerequisites.length ? (
          <section className="grid gap-4 sm:grid-cols-2">
            {course.audience.length ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-medium">Who it&apos;s for</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  {course.audience.map((item) => (
                    <li key={item} className="flex gap-2.5"><Users className="mt-1 h-4 w-4 shrink-0 text-primary" />{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {course.prerequisites.length ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-serif text-xl font-medium">Before you start</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  {course.prerequisites.map((item) => (
                    <li key={item} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" />{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="about">
          <p className="text-eyebrow text-primary">About this course</p>
          <h2 id="about" className="mt-2 font-serif text-3xl font-medium">Understand it first, then use it</h2>
          <div className="mt-6 max-w-2xl space-y-4 text-[16px] leading-7 text-muted-foreground">
            {course.description.split(/\n\s*\n/).map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </section>

        {course.firstLessonSlug ? (
          <section className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-secondary p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="font-serif text-2xl font-medium">{enrolled ? 'Pick up where you left off' : 'Ready when you are'}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {course.lessonCount} lessons, free. {enrolled ? 'Your progress is saved.' : 'Sign in and start with the first lesson.'}
              </p>
            </div>
            {enrollmentAction}
          </section>
        ) : null}
      </Container>
    </div>
  );
}
