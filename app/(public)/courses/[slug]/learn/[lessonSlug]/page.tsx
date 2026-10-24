import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { CourseLessonWorkspace } from '@/components/public/CourseLessonWorkspace';
import { getPublishedLessonWorkspace } from '@/lib/services/course-platform';
import { authOptions } from '@/lib/config/auth';
import { getEnrollment } from '@/lib/services/course-enrollment';
import { getLessonPersistence } from '@/lib/services/learner-persistence';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';

type PageProps = { params: Promise<{ slug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const workspace = await getPublishedLessonWorkspace(slug, lessonSlug);
  return workspace ? { title: `${workspace.lesson.title} — ${workspace.course.title}`, description: workspace.lesson.summary, robots: { index: false, follow: true } } : { title: 'Lesson not found', robots: { index: false } };
}

export default async function CourseLessonPage({ params }: PageProps) {
  const { slug, lessonSlug } = await params;
  const session = await getServerSession(authOptions);
  const destination = `/courses/${slug}/learn/${lessonSlug}`;
  if (!session?.user?.id || !session.user.sessionValid) redirect(`/login?from=${encodeURIComponent(destination)}`);
  if (session.user.role !== 'admin' && !session.user.emailVerified) redirect(`/verify-email?from=${encodeURIComponent(`/courses/${slug}/learn/${lessonSlug}`)}`);
  const enrollment = await getEnrollment(session.user.id, slug);
  if (session.user.role !== 'admin' && !enrollment?.enrollment) redirect(`/courses/${slug}`);
  const workspace = await getPublishedLessonWorkspace(slug, lessonSlug);
  if (!workspace) notFound();
  const persistence = await getLessonPersistence(session.user.id, workspace.course.id, lessonSlug);
  return <><AnalyticsTracker event="lesson_view" metadata={{ courseId: workspace.course.id, courseSlug: slug, lessonSlug }} /><CourseLessonWorkspace workspace={workspace} initialCompletedLessons={enrollment?.enrollment?.completedLessonSlugs || []} initialPersistence={persistence} /></>;
}
