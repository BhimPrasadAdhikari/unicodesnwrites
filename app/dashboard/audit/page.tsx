import type { Metadata } from 'next';
import { ScrollText } from 'lucide-react';

import { escapeRegex, FilterTabs, Pager, parsePage, redirectPastLastPage, SearchBox } from '@/components/cms/AdminListControls';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Badge } from '@/components/ui/Badge';
import { connectDB } from '@/lib/db/connection';
import AdminAuditLog from '@/lib/models/AdminAuditLog';

export const metadata: Metadata = { title: 'Audit log | CMS' };
export const dynamic = 'force-dynamic';

type Entry = { _id: { toString(): string }; actorEmail: string; action: string; targetType: string; targetId?: string; summary?: string; createdAt: Date };

const PAGE_SIZE = 50;

export default async function AuditLogPage(props: { searchParams: Promise<{ type?: string; q?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const search = (params.q || '').trim().slice(0, 120);

  await connectDB();
  const types = (await AdminAuditLog.distinct('targetType')).sort() as string[];
  const type = types.find((value) => value === params.type);

  const query: Record<string, unknown> = {};
  if (type) query.targetType = type;
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    query.$or = [{ actorEmail: pattern }, { action: pattern }, { summary: pattern }, { targetId: pattern }];
  }

  const [entries, total] = await Promise.all([
    AdminAuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<Entry[]>(),
    AdminAuditLog.countDocuments(query),
  ]);
  const linkParams = { type: params.type, q: params.q };
  redirectPastLastPage('/dashboard/audit', linkParams, page, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <DashboardPageHeader
        eyebrow="System"
        title="Audit log"
        description="Every admin change: deletes, role and status changes, newsletter sends and stops, imports. Kept for a year."
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          base="/dashboard/audit"
          params={linkParams}
          name="type"
          options={[{ value: '', label: 'All' }, ...types.map((value) => ({ value, label: value }))]}
        />
        <SearchBox base="/dashboard/audit" params={linkParams} placeholder="Search admin, action or detail" />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <ScrollText className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{search || type ? 'No entries match.' : 'No admin changes recorded yet.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry._id.toString()} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{entry.actorEmail}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant={entry.action === 'delete' ? 'destructive' : 'neutral'}>{entry.action}</Badge>{' '}
                    <span className="text-muted-foreground">{entry.targetType}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.summary || '—'}
                    {entry.targetId ? <span className="ml-2 font-mono text-[11px]">{entry.targetId}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager base="/dashboard/audit" params={linkParams} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
