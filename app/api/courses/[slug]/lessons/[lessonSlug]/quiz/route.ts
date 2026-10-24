import { NextRequest, NextResponse } from 'next/server';

import { gradePublishedLessonQuiz } from '@/lib/services/course-platform';
import { quizSubmissionSchema } from '@/lib/utils/validations/course';
import { LearnerAccessError, requireCourseAccess } from '@/lib/auth/learner';
import { recordQuizAttempt } from '@/lib/services/learner-persistence';

type RouteContext = { params: Promise<{ slug: string; lessonSlug: string }> };

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { slug, lessonSlug } = await params;
  let access: Awaited<ReturnType<typeof requireCourseAccess>>;
  try { access = await requireCourseAccess(slug); } catch (error) { return error instanceof LearnerAccessError ? NextResponse.json({ error: error.message }, { status: error.statusCode }) : NextResponse.json({ error: 'Unable to authorize quiz.' }, { status: 500 }); }
  const key = access.session.user.id;
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 30) {
    return NextResponse.json({ error: 'Too many quiz attempts. Try again shortly.' }, { status: 429 });
  }
  attempts.set(key, current && current.resetAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetAt: now + 60_000 });
  if (attempts.size > 5_000) attempts.clear();

  const body = await request.json().catch(() => null);
  const parsed = quizSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid quiz submission', details: parsed.error.issues }, { status: 400 });
  }

  const result = await gradePublishedLessonQuiz(slug, lessonSlug, parsed.data.answers);
  if (!result) return NextResponse.json({ error: 'Published lesson not found' }, { status: 404 });
  const { courseId, ...gradedResult } = result;
  try {
    const saved = await recordQuizAttempt({
      userId: access.session.user.id,
      courseId,
      lessonSlug,
      answers: parsed.data.answers,
      result: gradedResult,
    });
    return NextResponse.json({ ...gradedResult, ...saved });
  } catch (error) {
    console.error('Quiz attempt persistence failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Your quiz could not be saved. Try again.' }, { status: 503 });
  }
}
