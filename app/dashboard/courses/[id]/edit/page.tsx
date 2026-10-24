import { isValidObjectId } from 'mongoose';
import { notFound } from 'next/navigation';

import { CourseEditor } from '@/components/cms/CourseEditor';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';
import { normalizeLegacyCourse } from '@/lib/utils/validations/course';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCoursePage({ params }: PageProps) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const course = await Course.findById(id).lean();
  if (!course) notFound();

  return <div className="mx-auto max-w-6xl pb-16"><DashboardPageHeader eyebrow="Learning studio" title={`Edit ${course.title}`} description="Refine the curriculum, lesson companions, assessments, and publication state." /><CourseEditor initialData={JSON.parse(JSON.stringify(normalizeLegacyCourse(course)))} /></div>;
}
