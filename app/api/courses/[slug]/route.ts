import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import CourseQuizAttempt from '@/lib/models/CourseQuizAttempt';
import CourseRevision from '@/lib/models/CourseRevision';
import LearnerLessonState from '@/lib/models/LearnerLessonState';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';
import {
  CourseVersionConflictError,
  updateCourseVersioned,
} from '@/lib/services/course-admin';
import { isObjectId } from '@/lib/utils/validations/common';
import { courseInputSchema } from '@/lib/utils/validations/course';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdminSession();
    const { slug: id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    await connectDB();
    const course = await Course.findById(id).lean();
    return course
      ? NextResponse.json({ course })
      : NextResponse.json({ error: 'Course not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to load course' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAdminSession();
    const { slug: id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    const body = await request.json().catch(() => null);
    const update = z
      .object({
        course: courseInputSchema,
        expectedRevision: z.number().int().min(1),
        reason: z.enum(['autosave', 'manual', 'publish']).default('manual'),
      })
      .parse(body);
    const input = update.course;
    await connectDB();

    const duplicate = await Course.exists({ slug: input.slug, _id: { $ne: id } });
    if (duplicate) return NextResponse.json({ error: 'A course already uses this slug' }, { status: 409 });

    const course = await updateCourseVersioned({
      courseId: id,
      input,
      expectedRevision: update.expectedRevision,
      authorId: session.user.id,
      reason: input.status === 'published' ? 'publish' : update.reason,
    });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    return NextResponse.json({ course });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Course validation failed', details: error.issues }, { status: 400 });
    }
    if (error instanceof CourseVersionConflictError) {
      return NextResponse.json(
        { error: error.message, currentRevision: error.currentRevision },
        { status: 409 },
      );
    }
    console.error('Failed to update course:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdminSession();
    const { slug: id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    await connectDB();
    // Deleting would wipe learners' progress, notes and quiz history, so a course
    // anyone has enrolled in can only be archived.
    if (await CourseEnrollment.exists({ course: id })) {
      return NextResponse.json(
        { error: 'Learners are enrolled in this course, so it cannot be deleted without losing their progress. Archive it instead to hide it from the catalogue.' },
        { status: 409 },
      );
    }
    const course = await Course.findByIdAndDelete(id);
    if (course) {
      await Promise.all([
        CourseEnrollment.deleteMany({ course: course._id }),
        CourseQuizAttempt.deleteMany({ course: course._id }),
        LearnerLessonState.deleteMany({ course: course._id }),
        LearnerNotebookEntry.deleteMany({ course: course._id }),
        CourseRevision.deleteMany({ course: course._id }),
      ]);
    }
    return course
      ? NextResponse.json({ message: 'Course deleted' })
      : NextResponse.json({ error: 'Course not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
