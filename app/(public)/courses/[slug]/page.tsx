import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Play } from 'lucide-react';

import { Container } from '@/components/ui/Section';
import { SiteIconCell } from '@/components/ui/SiteIcon';
import { getPublishedCourseBySlug } from '@/lib/services/course-platform';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/config/auth';
import { getEnrollment } from '@/lib/services/course-enrollment';
import { CourseEnrollmentAction } from '@/components/public/CourseEnrollmentAction';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { siteConfig } from '@/lib/config/site.config';

type PageProps = { params: Promise<{ slug: string }> };

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
        <Container className="max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                <span className="text-primary">Course</span>
                <span aria-hidden="true">·</span>
                <span>{course.level}</span>
                <span aria-hidden="true">·</span>
                <span>{course.topic.replaceAll('-', ' ')}</span>
              </p>
              <h1 className="max-w-4xl text-title">{course.title}</h1>
              <p className="mt-5 max-w-3xl font-serif text-[19px] leading-[1.5] text-muted-foreground sm:text-[22px]">{course.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {course.firstLessonSlug ? <CourseEnrollmentAction slug={course.slug} firstLessonSlug={enrolled ? resumeLessonSlug : course.firstLessonSlug} authenticated={Boolean(session?.user?.id)} verified={Boolean(session?.user?.emailVerified || session?.user?.role === 'admin')} enrolled={enrolled} /> : null}
                <a href="#curriculum" className="inline-flex h-12 items-center rounded-lg border border-foreground px-6 text-[15px] font-medium transition-colors hover:bg-secondary">
                  See the lessons
                </a>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">Created and taught by {course.instructorName}</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <SiteIconCell kind="courses" label={`COURSE · ${course.level.toUpperCase()}`} iconSize={96} className="min-h-[200px] sm:min-h-[240px]" />
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                <div className="p-4 text-center">
                  <p className="font-serif text-2xl font-medium">{course.lessonCount}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Lessons</p>
                </div>
                <div className="p-4 text-center">
                  <p className="font-serif text-2xl font-medium">{Math.max(1, Math.round(course.durationMinutes / 60))}h</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">To finish</p>
                </div>
                <div className="p-4 text-center">
                  <p className="font-serif text-2xl font-medium">{course.quizCount}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Quizzes</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="max-w-[1440px] py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1fr]">
          <div className="space-y-10">
            <section>
              <p className="text-eyebrow text-primary">About this course</p>
              <h2 className="mt-3 text-3xl font-medium">Understand it first, then use it</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{course.description}</p>
            </section>
            <section>
              <h2 className="font-serif text-2xl font-medium">
                What you will learn
              </h2>
              <ul className="mt-5 space-y-3">
                {course.learningOutcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-3 text-sm leading-6">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </section>
            {course.prerequisites.length ? (
              <section>
                <h2 className="text-xl font-medium">Helpful to know first</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                  {course.prerequisites.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <section id="curriculum" className="scroll-mt-24">
            <div className="mb-6">
              <p className="text-eyebrow text-primary">Lessons</p>
              <h2 className="mt-2 text-3xl font-medium">What&apos;s in the course, step by step</h2>
            </div>
            <div className="space-y-4">
              {course.modules.map((module, moduleIndex) => (
                <div key={module.key} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="border-b border-border bg-muted/35 p-5">
                    <p className="text-eyebrow text-primary">Part {moduleIndex + 1}</p>
                    <h3 className="mt-1 text-lg font-medium">{module.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
                  </div>
                  <div className="divide-y divide-border/70">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <Link key={lesson.key} href={`/courses/${course.slug}/learn/${lesson.slug}`} className="group flex items-center gap-4 p-5 transition hover:bg-muted/35">
                        {completedSlugs.has(lesson.slug) ? (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success" aria-label="Completed"><CheckCircle2 className="h-4 w-4" /></span>
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold">{lessonIndex + 1}</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold group-hover:text-primary">{lesson.title}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {lesson.type.replaceAll('-', ' ')} • {lesson.durationMinutes} min
                          </span>
                        </span>
                        {enrolled ? (
                          <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        ) : (
                          <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Enroll to open</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
