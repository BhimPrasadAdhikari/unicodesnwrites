import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Types } from 'mongoose';
import { CheckCircle2 } from 'lucide-react';

import { Glyph } from '@/components/ui/Glyph';
import { Container } from '@/components/ui/Section';
import { authOptions } from '@/lib/config/auth';
import { siteConfig } from '@/lib/config/site.config';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import { getEnrollment } from '@/lib/services/course-enrollment';
import { getPublishedCourseBySlug, listPublishedCourses } from '@/lib/services/course-platform';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Course complete', robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ slug: string }> };

/** The end of a course: what you finished, how the checks went, and where to go next. */
export default async function CourseCompletePage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionValid) redirect(`/login?reauth=1&from=${encodeURIComponent(`/courses/${slug}/complete`)}`);

  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();

  const { course: courseRecord, enrollment, lessonSlugs } = await getEnrollment(session.user.id, slug);
  if (!enrollment || !courseRecord) redirect(`/courses/${slug}`);

  const done = new Set(enrollment.completedLessonSlugs ?? []);
  const remaining = lessonSlugs.filter((lessonSlug) => !done.has(lessonSlug));
  const lessons = course.modules.flatMap((module) => module.lessons);
  const titleOf = (lessonSlug: string) => lessons.find((lesson) => lesson.slug === lessonSlug)?.title ?? lessonSlug;

  const [quiz] = await CourseQuizAttempt.aggregate<{ attempts: number; average: number; passed: number }>([
    { $match: { user: new Types.ObjectId(session.user.id), course: courseRecord._id } },
    { $group: { _id: null, attempts: { $sum: 1 }, average: { $avg: '$score' }, passed: { $sum: { $cond: ['$passed', 1, 0] } } } },
  ]);
  const more = (await listPublishedCourses({ limit: 4 })).filter((item) => item.slug !== slug).slice(0, 3);

  const courseUrl = `https://${siteConfig.domain}/courses/${slug}`;
  const shareText = `I just finished “${course.title}” on unicodesnwrites.`;
  const finished = remaining.length === 0;

  return (
    <Container className="max-w-3xl py-14 sm:py-20">
      {finished ? (
        <>
          <p className="text-eyebrow text-primary">Course complete</p>
          <h1 className="mt-3 font-serif text-[clamp(2.25rem,6vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.02em]">
            You finished <span className="hl">{course.title}</span>.
          </h1>
          <p className="mt-5 text-[17px] leading-[1.6] text-muted-foreground">
            {lessonSlugs.length} lessons done
            {enrollment.completedAt ? ` on ${new Date(enrollment.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.
            {quiz?.attempts ? ` You averaged ${Math.round(quiz.average)}% across ${quiz.attempts} concept ${quiz.attempts === 1 ? 'check' : 'checks'}.` : ''}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(courseUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background hover:bg-foreground/90"
            >
              Share on LinkedIn
            </a>
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(courseUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-[15px] font-medium hover:border-foreground/40"
            >
              Share on X
            </a>
            <Link href="/learn/notebook" className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-[15px] font-medium hover:border-foreground/40">
              Review your notebook
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-eyebrow text-primary">Almost there</p>
          <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            {remaining.length} {remaining.length === 1 ? 'lesson' : 'lessons'} left in {course.title}.
          </h1>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {remaining.map((lessonSlug) => (
              <li key={lessonSlug}>
                <Link href={`/courses/${slug}/learn/${lessonSlug}`} className="flex min-h-12 items-center justify-between gap-3 py-3 text-[15px] hover:text-primary">
                  {titleOf(lessonSlug)} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="mt-14">
        <h2 className="text-eyebrow text-muted-foreground">Keep going</h2>
        <div className="mt-4 grid gap-3">
          {more.map((item) => (
            <Link key={item.slug} href={`/courses/${item.slug}`} className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-foreground/40">
              <Glyph kind="courses" size={24} className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary" />
              <span>
                <span className="block font-serif text-xl font-medium group-hover:text-primary">{item.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{item.summary}</span>
              </span>
            </Link>
          ))}
          <Link href="/newsletter" className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground hover:text-foreground">
            <CheckCircle2 className="h-4 w-4" /> Get the next course and dissections first in Letters
          </Link>
        </div>
      </section>
    </Container>
  );
}
