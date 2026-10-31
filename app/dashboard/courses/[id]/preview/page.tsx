import Link from 'next/link';
import { isValidObjectId } from 'mongoose';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  ListChecks,
} from 'lucide-react';

import { getCoursePreviewById } from '@/lib/services/course-platform';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function CoursePreviewPage({ params }: PageProps) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const course = await getCoursePreviewById(id);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-[1440px] pb-16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span>Admin preview · <strong className="capitalize">{course.status}</strong> content is not public.</span>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/courses" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold"><ArrowLeft className="h-3.5 w-3.5" /> Courses</Link>
          <Link href={`/dashboard/courses/${course.id}/edit`} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"><Edit3 className="h-3.5 w-3.5" /> Edit</Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid lg:grid-cols-[1fr_380px]">
          <div className="p-7 sm:p-10 lg:p-14">
            <div className="flex flex-wrap gap-2 text-eyebrow text-primary"><span>{course.eyebrow}</span><span>·</span><span>{course.level}</span><span>·</span><span>{course.topic.replaceAll('-', ' ')}</span></div>
            <h1 className="mt-5 max-w-4xl text-title">{course.title}</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">{course.summary}</p>
            <p className="mt-6 text-xs text-muted-foreground">Created and taught by {course.instructorName}</p>
          </div>
          <div className="flex min-h-64 flex-col justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.3),transparent_45%),linear-gradient(145deg,hsl(var(--muted)),hsl(var(--background)))] p-8">
            <BrainCircuit className="mx-auto h-24 w-24 stroke-[1] text-muted-foreground" />
            <div className="mt-8 grid grid-cols-3 divide-x divide-border/70 rounded-xl border border-border bg-background/70">
              {[{ icon: BookOpen, value: course.lessonCount, label: 'Lessons' }, { icon: Clock3, value: `${Math.max(1, Math.round(course.durationMinutes / 60))}h`, label: 'Learning' }, { icon: ListChecks, value: course.quizCount, label: 'Checks' }].map(({ icon: Icon, value, label }) => <div key={label} className="p-3 text-center"><Icon className="mx-auto h-4 w-4 text-muted-foreground" /><p className="mt-2 font-bold">{value}</p><p className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.72fr_1fr]">
        <div className="space-y-8 rounded-xl border border-border bg-card p-6 sm:p-8">
          <section><p className="text-eyebrow text-primary">Why this path</p><h2 className="mt-3 text-2xl font-serif font-medium">Understanding before implementation</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{course.description}</p></section>
          <section><h2 className="text-lg font-semibold">What learners will understand</h2><ul className="mt-4 space-y-3">{course.learningOutcomes.map((outcome) => <li key={outcome} className="flex gap-3 text-sm leading-6"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{outcome}</li>)}</ul></section>
        </div>
        <section>
          <p className="text-eyebrow text-primary">Curriculum preview</p>
          <h2 className="mt-2 text-3xl font-serif font-medium">A guided sequence of ideas</h2>
          <div className="mt-6 space-y-4">
            {course.modules.map((module, moduleIndex) => (
              <div key={module.key} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border bg-muted/35 p-5"><p className="text-eyebrow text-primary">Module {moduleIndex + 1}</p><h3 className="mt-1 text-lg font-semibold">{module.title}</h3><p className="mt-2 text-sm text-muted-foreground">{module.description}</p></div>
                <div className="divide-y divide-border/70">{module.lessons.map((lesson, lessonIndex) => <Link key={lesson.key} href={`/course-preview/${course.id}/${lesson.slug}`} className="flex items-center gap-4 p-5 transition hover:bg-muted/50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold">{lessonIndex + 1}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{lesson.title}</span><span className="mt-1 block text-xs text-muted-foreground">{lesson.type.replaceAll('-', ' ')} · {lesson.durationMinutes} min</span></span><span className={`rounded-md px-2 py-1 text-2xs font-bold uppercase ${lesson.published ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{lesson.published ? 'ready' : 'hidden'}</span></Link>)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
