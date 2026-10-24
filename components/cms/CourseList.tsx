'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BookOpen, Clock3, Edit3, ExternalLink, GraduationCap } from 'lucide-react';

import { ConfirmDeleteButton } from '@/components/cms/ConfirmDeleteButton';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

type CourseRow = {
  _id: string;
  title: string;
  slug: string;
  topic: string;
  level: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  modules: Array<{ lessons: Array<{ durationMinutes: number }> }>;
  updatedAt: string;
};

export function CourseList({ courses }: { courses: CourseRow[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');

  const removeCourse = async (course: CourseRow) => {
    const response = await fetch(`/api/courses/${encodeURIComponent(course._id)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Course could not be deleted.');
    router.refresh();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {feedback && <Alert variant="destructive" className="m-4">{feedback}</Alert>}
      {courses.length ? (
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader><tr><TableHead className="p-4">Course</TableHead><TableHead className="p-4">Curriculum</TableHead><TableHead className="p-4">Level</TableHead><TableHead className="p-4">Status</TableHead><TableHead className="p-4">Updated</TableHead><TableHead className="p-4 text-right">Actions</TableHead></tr></TableHeader>
            <TableBody>
              {courses.map((course) => {
                const lessons = course.modules.flatMap((module) => module.lessons);
                const minutes = lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0);
                return <TableRow key={course._id} className="transition"><TableCell className="p-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground"><GraduationCap className="h-5 w-5" /></span><span><span className="block max-w-[280px] truncate font-semibold">{course.title}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{course.topic.replaceAll('-', ' ')}</span></span></div></TableCell><TableCell className="p-4"><div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{lessons.length} lessons</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{Math.max(1, Math.round(minutes / 60))}h</span></div></TableCell><TableCell className="p-4 text-xs font-semibold capitalize">{course.level}</TableCell><TableCell className="p-4"><span className={`rounded-md border px-2.5 py-1 font-mono text-[12px] font-medium uppercase tracking-[0.06em] ${course.status === 'published' ? 'border-success/25 bg-success/10 text-success' : course.status === 'archived' ? 'border-warning/25 bg-warning/10 text-warning' : 'border-border bg-muted text-muted-foreground'}`}>{course.status}</span></TableCell><TableCell className="p-4 text-xs text-muted-foreground">{new Date(course.updatedAt).toLocaleDateString()}</TableCell><TableCell className="p-4"><div className="flex justify-end gap-1"><Link href={`/dashboard/courses/${course._id}/preview`} target="_blank" aria-label={`Preview ${course.title}`} className="touch-target rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><ExternalLink className="h-4 w-4" /></Link><Link href={`/dashboard/courses/${course._id}/edit`} aria-label={`Edit ${course.title}`} className="touch-target rounded-lg p-2 text-foreground hover:bg-secondary"><Edit3 className="h-4 w-4" /></Link><ConfirmDeleteButton compact label={course.title} onConfirm={() => removeCourse(course)} onError={setFeedback} /></div></TableCell></TableRow>;
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="px-6 py-20 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-foreground"><GraduationCap className="h-8 w-8" /></span><h2 className="mt-5 text-xl font-serif font-medium">Create your first AIML course</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Build a concept-first learning path with YouTube lessons, transcripts, study guides, and knowledge checks.</p><Link href="/dashboard/courses/new" className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">Create course</Link></div>
      )}
    </div>
  );
}
