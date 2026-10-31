import Link from 'next/link';
import { isValidObjectId } from 'mongoose';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';

import { CourseLessonWorkspace } from '@/components/public/CourseLessonWorkspace';
import { getLessonPreviewById } from '@/lib/services/course-platform';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string; lessonSlug: string }> };

const EMPTY_PERSISTENCE = {
  notes: '',
  activeTab: 'notes' as const,
  videoPositionSeconds: 0,
  lastSavedAt: null,
  quizAttemptCount: 0,
  quizAttempts: [],
};

// Admin access is enforced by app/dashboard/layout.tsx.
export default async function LessonPreviewPage({ params }: PageProps) {
  const { id, lessonSlug } = await params;
  if (!isValidObjectId(id)) notFound();
  const preview = await getLessonPreviewById(id, lessonSlug);
  if (!preview) notFound();

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70">
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
          basePath: `/dashboard/courses/${id}/preview`,
          overviewPath: `/dashboard/courses/${id}/preview`,
          answerKey: preview.answerKey,
        }}
      />
    </div>
  );
}
