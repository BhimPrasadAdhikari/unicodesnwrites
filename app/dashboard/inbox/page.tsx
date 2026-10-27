import type { Metadata } from 'next';
import { Mail } from 'lucide-react';

import { AdminRowActions } from '@/components/cms/AdminRowActions';
import { escapeRegex, FilterTabs, Pager, parsePage, redirectPastLastPage, SearchBox } from '@/components/cms/AdminListControls';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Badge } from '@/components/ui/Badge';
import { connectDB } from '@/lib/db/connection';
import { ContactSubmission } from '@/lib/models/ContactSubmission';

export const metadata: Metadata = { title: 'Inbox | CMS' };
export const dynamic = 'force-dynamic';

type Message = { _id: { toString(): string }; name: string; email: string; subject?: string; message: string; status: 'new' | 'read' | 'replied'; submittedAt: Date };

const PAGE_SIZE = 20;
const STATUSES = ['new', 'read', 'replied'] as const;

export default async function InboxPage(props: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const status = STATUSES.find((value) => value === params.status);
  const search = (params.q || '').trim().slice(0, 120);

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    query.$or = [{ name: pattern }, { email: pattern }, { subject: pattern }, { message: pattern }];
  }

  await connectDB();
  const [messages, total, counts] = await Promise.all([
    ContactSubmission.find(query).sort({ submittedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<Message[]>(),
    ContactSubmission.countDocuments(query),
    ContactSubmission.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const countOf = (value: string) => counts.find((row) => row._id === value)?.count ?? 0;
  const all = counts.reduce((sum, row) => sum + row.count, 0);
  const linkParams = { status: params.status, q: params.q };
  redirectPastLastPage('/dashboard/inbox', linkParams, page, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Readers"
        title="Inbox"
        description="Messages sent through the contact form. Reply by email, then mark them replied."
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          base="/dashboard/inbox"
          params={linkParams}
          name="status"
          options={[
            { value: '', label: 'All', count: all },
            { value: 'new', label: 'New', count: countOf('new') },
            { value: 'read', label: 'Read', count: countOf('read') },
            { value: 'replied', label: 'Replied', count: countOf('replied') },
          ]}
        />
        <SearchBox base="/dashboard/inbox" params={linkParams} placeholder="Search name, email or text" />
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Mail className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{search || status ? 'No messages match.' : 'No messages yet.'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => {
            const id = message._id.toString();
            const subject = message.subject || 'Message from the contact form';
            const replyHref = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${subject}`)}`;
            return (
              <li key={id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{subject}</p>
                      <Badge variant={message.status === 'new' ? 'info' : message.status === 'replied' ? 'success' : 'neutral'} className="capitalize">{message.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {message.name} · <a href={replyHref} className="underline underline-offset-2">{message.email}</a> · {new Date(message.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{message.message}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a href={replyHref} className="inline-flex min-h-9 items-center rounded-lg border border-foreground bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90">Reply by email</a>
                  <AdminRowActions
                    actions={[
                      ...(message.status !== 'read' ? [{ label: 'Mark read', url: `/api/admin/contacts/${id}`, method: 'PATCH' as const, body: { status: 'read' } }] : []),
                      ...(message.status !== 'replied' ? [{ label: 'Mark replied', url: `/api/admin/contacts/${id}`, method: 'PATCH' as const, body: { status: 'replied' } }] : []),
                      { label: 'Delete', url: `/api/admin/contacts/${id}`, method: 'DELETE' as const, confirm: 'Confirm delete', tone: 'danger' as const },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pager base="/dashboard/inbox" params={linkParams} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
