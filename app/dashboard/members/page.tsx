import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { UserRound } from 'lucide-react';

import { AdminRowActions, type AdminAction } from '@/components/cms/AdminRowActions';
import { escapeRegex, FilterTabs, Pager, parsePage, redirectPastLastPage, SearchBox } from '@/components/cms/AdminListControls';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { authOptions } from '@/lib/config/auth';
import { connectDB } from '@/lib/db/connection';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import { User } from '@/lib/models/User';

export const metadata: Metadata = { title: 'Members | CMS' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;
const ROLES = ['admin', 'author', 'learner'] as const;

type MemberRow = { _id: { toString(): string }; name: string; email: string; role: (typeof ROLES)[number]; emailVerified?: Date; createdAt: Date };

export default async function MembersPage(props: { searchParams: Promise<{ role?: string; q?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const role = ROLES.find((value) => value === params.role);
  const search = (params.q || '').trim().slice(0, 120);

  const query: Record<string, unknown> = {};
  if (role) query.role = role;
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  const session = await getServerSession(authOptions);
  await connectDB();
  const [members, total, roleCounts, unverified] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).select('name email role emailVerified createdAt').lean<MemberRow[]>(),
    User.countDocuments(query),
    User.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ emailVerified: { $exists: false } }),
  ]);
  const enrollmentRows = await CourseEnrollment.aggregate<{ _id: unknown; enrolled: number; completed: number }>([
    { $match: { user: { $in: members.map((member) => member._id) } } },
    { $group: { _id: '$user', enrolled: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
  ]);
  const enrollmentsBy = new Map(enrollmentRows.map((row) => [String(row._id), row]));
  const countOf = (value: string) => roleCounts.find((row) => row._id === value)?.count ?? 0;
  const linkParams = { role: params.role, q: params.q };
  redirectPastLastPage('/dashboard/members', linkParams, page, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Readers"
        title="Members"
        description={`Everyone with an account. ${unverified} ${unverified === 1 ? 'has' : 'have'} not verified their email yet.`}
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          base="/dashboard/members"
          params={linkParams}
          name="role"
          options={[
            { value: '', label: 'All', count: roleCounts.reduce((sum, row) => sum + row.count, 0) },
            { value: 'learner', label: 'Learners', count: countOf('learner') },
            { value: 'author', label: 'Authors', count: countOf('author') },
            { value: 'admin', label: 'Admins', count: countOf('admin') },
          ]}
        />
        <SearchBox base="/dashboard/members" params={linkParams} placeholder="Search name or email" />
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <UserRound className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No members match.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table className="min-w-[880px]">
            <TableHeader>
              <tr>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const id = member._id.toString();
                const isSelf = session?.user?.id === id;
                const enrollment = enrollmentsBy.get(id);
                const url = `/api/admin/users/${id}`;
                const actions: AdminAction[] = isSelf
                  ? []
                  : [
                      ...(member.emailVerified ? [] : [{ label: 'Mark verified', url, method: 'PATCH' as const, body: { verified: true } }]),
                      ...ROLES.filter((value) => value !== member.role).map((value) => ({
                        label: `Make ${value}`,
                        url,
                        method: 'PATCH' as const,
                        body: { role: value },
                        confirm: `Confirm: make ${value}`,
                      })),
                      { label: 'Sign out everywhere', url, method: 'PATCH', body: { signOut: true }, confirm: 'Confirm sign-out', tone: 'danger' },
                    ];
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <p className="font-semibold">{member.name}{isSelf ? <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span> : null}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </TableCell>
                    <TableCell><Badge variant={member.role === 'admin' ? 'info' : 'neutral'} className="capitalize">{member.role}</Badge></TableCell>
                    <TableCell>{member.emailVerified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Unverified</Badge>}</TableCell>
                    <TableCell className="text-xs">{enrollment ? `${enrollment.enrolled} enrolled · ${enrollment.completed} done` : <span className="text-muted-foreground">None</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{actions.length ? <AdminRowActions actions={actions} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pager base="/dashboard/members" params={linkParams} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
