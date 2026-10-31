import type { Metadata } from 'next';
import Link from 'next/link';
import { isValidObjectId } from 'mongoose';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';

import { CourseLessonWorkspace } from '@/components/public/CourseLessonWorkspace';
import { authOptions } from '@/lib/config/auth';
import { getLessonPreviewById } from '@/lib/services/course-platform';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Lesson preview', robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ id: string; lessonSlug: string }> };

const EMPTY_PERSISTENCE = {
  notes: '',
  activeTab: 'notes' as const,
  videoPositionSeconds: 0,
  lastSavedAt: null,
  quizAttemptCount: 0,
  quizAttempts: [],
};

// Full-width admin preview of any lesson, including lessons in draft courses.
export default async function LessonPreviewPage({ params }: PageProps) {
  const { id, lessonSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.sessionValid) redirect(`/login?from=${encodeURIComponent(`/course-preview/${id}/${lessonSlug}`)}`);
  if (session.user.role !== 'admin') notFound();
  if (!isValidObjectId(id)) notFound();
  const preview = await getLessonPreviewById(id, lessonSlug);
  if (!preview) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Lesson preview · <strong className="capitalize">{preview.status}</strong> course. Nothing you do here is saved.
        </span>
        <Link href={`/dashboard/courses/${id}/preview`} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold">
          <ArrowLeft className="h-3.5 w-3.5" /> Course preview
        </Link>
      </div>
      <CourseLessonWorkspace
        workspace={preview.workspace}
        initialCompletedLessons={[]}
        initialPersistence={EMPTY_PERSISTENCE}
        preview={{
          basePath: `/course-preview/${id}`,
          overviewPath: `/dashboard/courses/${id}/preview`,
          answerKey: preview.answerKey,
        }}
      />
    </div>
  );
}
