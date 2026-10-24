import { getServerSession, type Session } from 'next-auth';

import { authOptions } from '@/lib/config/auth';
import { getEnrollment } from '@/lib/services/course-enrollment';

export class LearnerAccessError extends Error {
  constructor(message: string, public statusCode: number) { super(message); this.name = 'LearnerAccessError'; }
}

export async function requireCourseAccess(courseSlug: string) {
  const session = await requireVerifiedSession();
  if (session.user.role === 'admin') return { session, enrollment: null, courseId: null, lessonSlugs: null };
  const result = await getEnrollment(session.user.id, courseSlug);
  if (!result.course) throw new LearnerAccessError('Course not found.', 404);
  if (!result.enrollment) throw new LearnerAccessError('Enroll in this course to continue.', 403);
  return { session, enrollment: result.enrollment, courseId: result.course._id.toString(), lessonSlugs: result.lessonSlugs };
}

export async function requireAuthenticatedSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionValid) throw new LearnerAccessError('Sign in to continue.', 401);
  return session;
}

export async function requireVerifiedSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionValid) throw new LearnerAccessError('Sign in to continue.', 401);
  if (session.user.role !== 'admin' && !session.user.emailVerified) {
    throw new LearnerAccessError('Verify your email to continue.', 403);
  }
  return session;
}
