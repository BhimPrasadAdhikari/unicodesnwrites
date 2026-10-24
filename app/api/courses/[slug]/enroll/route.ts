import { NextResponse } from 'next/server';
import { LearnerAccessError, requireVerifiedSession } from '@/lib/auth/learner';
import { enrollInCourse, getEnrollment } from '@/lib/services/course-enrollment';

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await requireVerifiedSession(); const { slug } = await params;
    const result = await getEnrollment(session.user.id, slug);
    if (!result.course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    return NextResponse.json({ enrolled: Boolean(result.enrollment), completedLessonSlugs: result.enrollment?.completedLessonSlugs || [], status: result.enrollment?.status || null });
  } catch (error) {
    return error instanceof LearnerAccessError ? NextResponse.json({ error: error.message }, { status: error.statusCode }) : NextResponse.json({ error: 'Unable to load enrollment.' }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: Context) {
  try {
    const session = await requireVerifiedSession(); const { slug } = await params;
    const enrollment = await enrollInCourse(session.user.id, slug);
    return enrollment ? NextResponse.json({ enrolled: true }, { status: 201 }) : NextResponse.json({ error: 'Published course not found.' }, { status: 404 });
  } catch (error) {
    return error instanceof LearnerAccessError ? NextResponse.json({ error: error.message }, { status: error.statusCode }) : NextResponse.json({ error: 'Unable to enroll.' }, { status: 500 });
  }
}
