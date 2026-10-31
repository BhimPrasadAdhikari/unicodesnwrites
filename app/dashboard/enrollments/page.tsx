import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  FileText,
  Gauge,
  GraduationCap,
  ListChecks,
  Users,
} from 'lucide-react';

import { AdminRowActions } from '@/components/cms/AdminRowActions';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { getAdminEnrollmentOverview } from '@/lib/services/course-enrollment';

export const dynamic = 'force-dynamic';

export default async function EnrollmentsPage() {
  const overview = await getAdminEnrollmentOverview();
  const cards = [
    { label: 'Total enrollments', value: overview.total, icon: Users },
    { label: 'Studied in 7 days', value: overview.activeLast7Days, icon: Activity },
    { label: 'Completions', value: overview.completed, icon: CheckCircle2 },
    { label: 'Quiz attempts', value: overview.quiz.attempts, icon: ListChecks },
    { label: 'Average quiz score', value: `${overview.quiz.averageScore}%`, icon: Gauge },
    { label: 'AI notebook entries', value: overview.notebookEntries, icon: FileText },
  ];

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Student Progress"
        title="Course Enrollments"
        description="Track student enrollments, lesson completions, quiz attempts, and course study activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-border bg-card p-5"><Icon className="h-5 w-5 text-muted-foreground" /><p className="mt-4 text-3xl font-serif font-medium">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-lg border border-border bg-card px-3 py-1.5">{overview.active} active enrollments</span>
        <span className="rounded-lg border border-border bg-card px-3 py-1.5">{overview.quiz.passRate}% quiz pass rate</span>
        <span className="rounded-lg border border-border bg-card px-3 py-1.5">{overview.learnersWithNotes} learners writing private notes</span>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5"><h2 className="font-semibold">Course health</h2><p className="mt-1 text-xs text-muted-foreground">Enrollment and completion by learning path.</p></div>
          <div className="divide-y divide-border/70">
            {overview.byCourse.length ? overview.byCourse.map((item: { _id: unknown; title: string; slug: string; enrollments: number; completions: number }) => {
              const completionRate = item.enrollments ? Math.round((item.completions / item.enrollments) * 100) : 0;
              return <div key={String(item._id)} className="p-5"><div className="flex items-start justify-between gap-4"><div><Link href={`/dashboard/courses/${String(item._id)}/preview`} className="font-semibold hover:text-primary">{item.title}</Link><p className="mt-1 text-xs text-muted-foreground">{item.completions} completions · {completionRate}% rate</p></div><span className="rounded-md bg-muted px-3 py-1 text-xs font-medium">{item.enrollments} enrolled</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${completionRate}%` }} /></div></div>;
            }) : <p className="p-6 text-sm text-muted-foreground">No enrollments yet.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5"><h2 className="font-semibold">Lesson activity</h2><p className="mt-1 text-xs text-muted-foreground">Unique learners who opened each lesson and how many wrote notes.</p></div>
          <div className="divide-y divide-border/70">
            {overview.lessonActivity.length ? overview.lessonActivity.map((item: { _id: unknown; courseTitle: string; courseSlug: string; lessonSlug: string; learners: number; noteAuthors: number; lastAccessedAt: Date }) => <div key={String(item._id)} className="flex items-center justify-between gap-4 p-4 sm:p-5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.lessonSlug.replaceAll('-', ' ')}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.courseTitle} · last active {new Date(item.lastAccessedAt).toLocaleDateString()}</p></div><div className="flex shrink-0 gap-2"><span className="rounded-md bg-secondary px-2.5 py-1 text-2xs font-medium text-foreground">{item.learners} learners</span><span className="rounded-md bg-muted px-2.5 py-1 text-2xs font-medium text-muted-foreground">{item.noteAuthors} notes</span></div></div>) : <p className="p-6 text-sm text-muted-foreground">Lesson activity appears after learners open a course workspace.</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5"><h2 className="font-semibold">Learner progress</h2><p className="mt-1 text-xs text-muted-foreground">Recent student enrollment status and progress metrics.</p></div>
        <div className="overflow-x-auto">
          <Table className="min-w-[1040px]">
            <TableHeader><tr><TableHead>Learner</TableHead><TableHead>Course</TableHead><TableHead>Progress</TableHead><TableHead>Engagement</TableHead><TableHead>Quiz</TableHead><TableHead>Certificate</TableHead><TableHead>Last study</TableHead></tr></TableHeader>
            <TableBody>
              {overview.recent.map((item) => {
                const user = item.user as unknown as { name?: string; email?: string } | null;
                const course = item.course as unknown as { title?: string; slug?: string } | null;
                return <TableRow key={item._id.toString()}><TableCell><p className="font-semibold">{user?.name || 'Deleted user'}</p><p className="text-xs text-muted-foreground">{user?.email || '—'}</p></TableCell><TableCell>{course?.title || 'Deleted course'}</TableCell><TableCell><Badge variant={item.status === 'completed' ? 'success' : 'neutral'} className="capitalize">{item.status}</Badge><p className="mt-2 text-2xs text-muted-foreground">{item.completedLessonSlugs.length} lessons complete</p></TableCell><TableCell className="text-xs"><p>{item.metrics.lessonsVisited} lessons opened</p><p className="mt-1 text-muted-foreground">{item.metrics.notesCount} with notes</p></TableCell><TableCell className="text-xs">{item.metrics.quizAttempts ? <><p>{item.metrics.averageQuizScore}% average</p><p className="mt-1 text-muted-foreground">{item.metrics.quizAttempts} attempts</p></> : <span className="text-muted-foreground">No attempts</span>}</TableCell><TableCell className="text-xs"><CertificateCell certificate={item.certificate} /></TableCell><TableCell className="text-xs text-muted-foreground">{new Date(item.metrics.lastStudyAt).toLocaleString()}</TableCell></TableRow>;
              })}
            </TableBody>
          </Table>
        </div>
        {!overview.recent.length && <div className="p-10 text-center"><GraduationCap className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">No learners yet.</p></div>}
      </section>
    </div>
  );
}

/** Link to a completed learner's certificate, with revoke/restore (audit-logged by the API). */
function CertificateCell({ certificate }: { certificate: { id: string; code: string; hidden: boolean; revoked: boolean } | null }) {
  if (!certificate) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-1.5">
      {certificate.revoked
        ? <p className="font-mono text-muted-foreground line-through">{certificate.code}</p>
        : <Link href={`/certificates/${certificate.code}`} target="_blank" className="font-mono hover:text-primary">{certificate.code}</Link>}
      {certificate.revoked ? <Badge variant="destructive">Revoked</Badge> : certificate.hidden ? <Badge variant="neutral">Hidden by learner</Badge> : null}
      <AdminRowActions
        actions={[certificate.revoked
          ? { label: 'Restore', url: `/api/admin/certificates/${certificate.id}`, method: 'PATCH', body: { revoked: false } }
          : { label: 'Revoke', url: `/api/admin/certificates/${certificate.id}`, method: 'PATCH', body: { revoked: true }, tone: 'danger', confirm: 'Confirm revoke' }]}
      />
    </div>
  );
}
