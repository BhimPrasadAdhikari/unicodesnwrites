import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import { listPublishedCourses } from '@/lib/services/course-platform';
import { courseInputSchema } from '@/lib/utils/validations/course';

export async function GET(request: NextRequest) {
  try {
    const courses = await listPublishedCourses({
      topic: request.nextUrl.searchParams.get('topic') || undefined,
      level: request.nextUrl.searchParams.get('level') || undefined,
    });
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Failed to list courses:', error);
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const input = courseInputSchema.parse(body);

    await connectDB();
    if (await Course.exists({ slug: input.slug })) {
      return NextResponse.json({ error: 'A course already uses this slug' }, { status: 409 });
    }

    const course = await Course.create({
      ...input,
      revision: 1,
      author: session.user.id,
      publishedAt: input.status === 'published' ? new Date() : undefined,
    });
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Course validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
