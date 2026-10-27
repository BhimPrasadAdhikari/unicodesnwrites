import Link from 'next/link';
import { BookOpen, Clock3, GraduationCap, Plus, Radio } from 'lucide-react';

import { CourseList } from '@/components/cms/CourseList';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { connectDB } from '@/lib/db/connection';
import Course from '@/lib/models/Course';

export const dynamic = 'force-dynamic';

export default async function CoursesDashboardPage() {
  await connectDB();
  // Only what the list and totals show: full lessons carry transcripts and quizzes.
  const courses = await Course.find()
    .sort({ updatedAt: -1 })
    .select('title topic level status updatedAt modules.lessons.durationMinutes')
    .lean();
  const serialized = JSON.parse(JSON.stringify(courses));
  const lessons = courses.flatMap((course) => course.modules.flatMap((module) => module.lessons));
  const minutes = lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0);

  return (
    <div className="space-y-7">
      <DashboardPageHeader eyebrow="Academy & Courses" title="AIML Courses" description="Create and manage interactive AI/ML courses, curriculum modules, lessons, and quizzes." action={<Link href="/dashboard/courses/new" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"><Plus className="h-4 w-4" /> New course</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">{[
        { label: 'Courses', value: courses.length, icon: GraduationCap },
        { label: 'Published', value: courses.filter((course) => course.status === 'published').length, icon: Radio },
        { label: 'Learning hours', value: Math.round(minutes / 60), icon: Clock3 },
      ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-eyebrow text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-3 text-3xl font-serif font-medium">{value}</p></div>)}</div>
      <CourseList courses={serialized} />
    </div>
  );
}
