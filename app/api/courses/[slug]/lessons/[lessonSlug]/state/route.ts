import { NextRequest, NextResponse } from 'next/server';

import { LearnerAccessError, requireCourseAccess } from '@/lib/auth/learner';
import { getPublishedLessonWorkspace } from '@/lib/services/course-platform';
import { getLessonPersistence, saveLessonState } from '@/lib/services/learner-persistence';
import { lessonStatePatchSchema } from '@/lib/utils/validations/learner';

type RouteContext = { params: Promise<{ slug: string; lessonSlug: string }> };

function accessError(error: unknown) {
  return error instanceof LearnerAccessError
    ? NextResponse.json({ error: error.message }, { status: error.statusCode })
    : NextResponse.json({ error: 'Unable to authorize learning state.' }, { status: 500 });
}

export async function GET(_: NextRequest, { params }: RouteContext) {
  const { slug, lessonSlug } = await params;
  try {
    const access = await requireCourseAccess(slug);
    const workspace = access.courseId ? null : await getPublishedLessonWorkspace(slug, lessonSlug);
    const courseId = access.courseId || workspace?.course.id;
    if (!courseId || (access.lessonSlugs && !access.lessonSlugs.includes(lessonSlug))) return NextResponse.json({ error: 'Published lesson not found.' }, { status: 404 });
    const state = await getLessonPersistence(access.session.user.id, courseId, lessonSlug);
    return NextResponse.json(state, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return accessError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { slug, lessonSlug } = await params;
  try {
    const access = await requireCourseAccess(slug);
    const parsed = lessonStatePatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid learning state.' }, { status: 400 });
    const workspace = access.courseId ? null : await getPublishedLessonWorkspace(slug, lessonSlug);
    const courseId = access.courseId || workspace?.course.id;
    if (!courseId || (access.lessonSlugs && !access.lessonSlugs.includes(lessonSlug))) return NextResponse.json({ error: 'Published lesson not found.' }, { status: 404 });
    const result = await saveLessonState({
      userId: access.session.user.id,
      role: access.session.user.role,
      courseId,
      lessonSlug,
      patch: parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    return accessError(error);
  }
}
