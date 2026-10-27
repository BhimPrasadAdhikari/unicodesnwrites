import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import {
  CourseVersionConflictError,
  listCourseVersions,
  restoreCourseVersion,
} from '@/lib/services/course-admin';
import { isObjectId } from '@/lib/utils/validations/common';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdminSession();
    const { slug: id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }
    const result = await listCourseVersions(id);
    return result
      ? NextResponse.json(result)
      : NextResponse.json({ error: 'Course not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Failed to list course versions:', error);
    return NextResponse.json({ error: 'Failed to load version history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAdminSession();
    const { slug: id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }
    const input = z
      .object({
        revision: z.number().int().min(1),
        expectedRevision: z.number().int().min(1),
      })
      .parse(await request.json().catch(() => null));
    const course = await restoreCourseVersion({
      courseId: id,
      revision: input.revision,
      expectedRevision: input.expectedRevision,
      authorId: session.user.id,
    });
    return course
      ? NextResponse.json({ course })
      : NextResponse.json({ error: 'Course or version not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof CourseVersionConflictError) {
      return NextResponse.json(
        { error: error.message, currentRevision: error.currentRevision },
        { status: 409 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid restore request' }, { status: 400 });
    }
    console.error('Failed to restore course version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 },
    );
  }
}
