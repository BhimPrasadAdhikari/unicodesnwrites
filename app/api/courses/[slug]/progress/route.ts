import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LearnerAccessError, requireVerifiedSession } from '@/lib/auth/learner';
import { updateCourseProgress } from '@/lib/services/course-enrollment';

const schema = z.object({ lessonSlug: z.string().trim().min(1).max(160), completed: z.boolean() });
type Context = { params: Promise<{ slug: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const session = await requireVerifiedSession();
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: 'Invalid progress update.' }, { status: 400 });
    const { slug } = await params; const isAdmin = session.user.role === 'admin';
    // Admins previewing a course aren't learners: don't enroll them or count them.
    const result = await updateCourseProgress(session.user.id, slug, input.data.lessonSlug, input.data.completed, { autoEnroll: !isAdmin });
    if (result.kind === 'not-enrolled') return isAdmin
      ? NextResponse.json({ preview: true })
      : NextResponse.json({ error: 'Enroll before recording progress.' }, { status: 403 });
    if (result.kind !== 'ok') return NextResponse.json({ error: 'Course or lesson not found.' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return error instanceof LearnerAccessError ? NextResponse.json({ error: error.message }, { status: error.statusCode }) : NextResponse.json({ error: 'Unable to update progress.' }, { status: 500 });
  }
}
