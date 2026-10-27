'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, Download, Mail, RefreshCw, Search, Send, Trash2, UserMinus, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface Subscriber {
  _id: string;
  email: string;
  name?: string;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  source: string;
  createdAt: string;
  confirmedAt?: string;
}

interface SubscriberListProps {
  subscribers: Subscriber[];
  totalCount: number;
  page: number;
  totalPages: number;
  search?: string;
  statusFilter?: '' | Subscriber['status'];
}

const statusStyles = {
  confirmed: 'border-success/20 bg-success/10 text-success',
  pending: 'border-warning/20 bg-warning/10 text-warning',
  unsubscribed: 'border-border/20 bg-muted-foreground/10 text-foreground',
};

export default function SubscriberList({ subscribers: initialSubscribers, totalCount, page, totalPages, search = '', statusFilter = '' }: SubscriberListProps) {
  const router = useRouter();
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [searchQuery, setSearchQuery] = useState(search);

  // Keeps search and status filters when paging or changing one of them.
  const listUrl = (changes: { page?: number; q?: string; status?: string }) => {
    const params = new URLSearchParams();
    const q = changes.q ?? search;
    const status = changes.status ?? statusFilter;
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (changes.page && changes.page > 1) params.set('page', String(changes.page));
    const query = params.toString();
    return query ? `/dashboard/subscribers?${query}` : '/dashboard/subscribers';
  };
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDelete = async (subscriber: Subscriber) => {
    if (pendingDeleteId !== subscriber._id) {
      setPendingDeleteId(subscriber._id);
      setFeedback(null);
      return;
    }

    setWorkingId(subscriber._id);
    try {
      const response = await fetch(`/api/subscribers/${encodeURIComponent(subscriber._id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Subscriber could not be deleted.');
      setSubscribers((current) => current.filter((item) => item._id !== subscriber._id));
      setFeedback({ type: 'success', message: `${subscriber.email} was removed.` });
      setPendingDeleteId(null);
      router.refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Delete failed. Please try again.' });
    } finally {
      setWorkingId(null);
    }
  };

  const handleSendTest = async (subscriber: Subscriber) => {
    setWorkingId(subscriber._id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/subscribers/${encodeURIComponent(subscriber._id)}/test-email`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Test email could not be sent.');
      setFeedback({ type: 'success', message: payload?.message || `Test email sent to ${subscriber.email}.` });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Test email failed. Please try again.' });
    } finally {
      setWorkingId(null);
    }
  };

  const handleAction = async (subscriber: Subscriber, action: 'unsubscribe' | 'resend-confirmation') => {
    if (action === 'unsubscribe' && !window.confirm(`Unsubscribe ${subscriber.email}? They will stop receiving newsletters.`)) return;
    setWorkingId(subscriber._id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/subscribers/${encodeURIComponent(subscriber._id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Subscriber could not be updated.');
      if (payload?.status) {
        setSubscribers((current) => current.map((item) => item._id === subscriber._id ? { ...item, status: payload.status } : item));
      }
      setFeedback({ type: 'success', message: payload?.message || 'Subscriber updated.' });
      router.refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Subscriber could not be updated.' });
    } finally {
      setWorkingId(null);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(listUrl({ q: searchQuery.trim(), page: 1 }));
  };

  const handleExport = async () => {
    setExporting(true);
    setFeedback(null);
    try {
      // Exports what the list is filtered to; with no status filter the API exports confirmed subscribers.
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      const response = await fetch(`/api/subscribers/export${params.size ? `?${params}` : ''}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Subscriber export failed.');
      }
      const url = URL.createObjectURL(await response.blob());
      const download = document.createElement('a');
      download.href = url;
      download.download = 'subscribers.csv';
      download.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Subscriber export downloaded.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Subscriber export failed.' });
    } finally {
      setExporting(false);
    }
  };

  const renderActions = (subscriber: Subscriber) => (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => handleSendTest(subscriber)}
        disabled={workingId === subscriber._id}
        aria-label={`Send test email to ${subscriber.email}`}
        className="touch-target rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {workingId === subscriber._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
      </button>
      {subscriber.status === 'pending' && (
        <button
          type="button"
          onClick={() => handleAction(subscriber, 'resend-confirmation')}
          disabled={workingId === subscriber._id}
          aria-label={`Resend confirmation email to ${subscriber.email}`}
          title="Resend confirmation email"
          className="touch-target rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
      {subscriber.status !== 'unsubscribed' && (
        <button
          type="button"
          onClick={() => handleAction(subscriber, 'unsubscribe')}
          disabled={workingId === subscriber._id}
          aria-label={`Unsubscribe ${subscriber.email}`}
          title="Unsubscribe"
          className="touch-target rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => handleDelete(subscriber)}
        disabled={workingId === subscriber._id}
        aria-label={pendingDeleteId === subscriber._id ? `Confirm deletion of ${subscriber.email}` : `Delete ${subscriber.email}`}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:opacity-50 ${pendingDeleteId === subscriber._id ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive'}`}
      >
        <Trash2 className="h-4 w-4" />
        {pendingDeleteId === subscriber._id ? 'Confirm' : <span className="sr-only">Delete</span>}
      </button>
      {pendingDeleteId === subscriber._id && (
        <button type="button" onClick={() => setPendingDeleteId(null)} className="px-1.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      )}
    </div>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/70">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <label htmlFor="subscriber-search" className="sr-only">Search subscribers</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="subscriber-search"
            type="search"
            maxLength={254}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by email"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="subscriber-status" className="sr-only">Filter by status</label>
          <select
            id="subscriber-status"
            value={statusFilter}
            onChange={(event) => router.push(listUrl({ status: event.target.value, page: 1 }))}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium"
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <button type="button" onClick={handleExport} disabled={exporting} title={statusFilter ? undefined : 'Exports confirmed subscribers matching the current search'} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50">
            {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
          </button>
          <button type="button" onClick={() => router.refresh()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-3.5 text-sm font-semibold text-background transition hover:bg-foreground/90">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
        {totalCount.toLocaleString()} subscribers · page {page} of {Math.max(totalPages, 1)}
      </div>

      {feedback && (
        <Alert role="status" variant={feedback.type === 'success' ? 'success' : 'destructive'} className="mx-4 mt-4 sm:mx-5">
          {feedback.message}
        </Alert>
      )}

      <div className="grid gap-3 p-4 md:hidden">
        {subscribers.map((subscriber) => (
          <article key={subscriber._id} className="rounded-xl border border-border bg-background/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{subscriber.name || 'Subscriber'}</p><p className="mt-1 truncate text-xs text-muted-foreground">{subscriber.email}</p></div>
              <span className={`rounded-md border px-2 py-1 text-2xs font-semibold capitalize ${statusStyles[subscriber.status]}`}>{subscriber.status}</span>
            </div>
            <dl className="my-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted-foreground">Source</dt><dd className="mt-1 capitalize">{subscriber.source}</dd></div><div><dt className="text-muted-foreground">Joined</dt><dd className="mt-1">{format(new Date(subscriber.createdAt), 'MMM d, yyyy')}</dd></div></dl>
            {renderActions(subscriber)}
          </article>
        ))}
        {subscribers.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No subscribers found.</p>}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[760px]">
          <TableHeader><tr><TableHead>Subscriber</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></tr></TableHeader>
          <TableBody>
            {subscribers.map((subscriber) => (
              <TableRow key={subscriber._id}>
                <TableCell><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">{subscriber.email.charAt(0).toUpperCase()}</span><div><p className="text-sm font-medium">{subscriber.name || 'Subscriber'}</p><p className="mt-0.5 text-xs text-muted-foreground">{subscriber.email}</p></div></div></TableCell>
                <TableCell><span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-2xs font-semibold capitalize ${statusStyles[subscriber.status]}`}>{subscriber.status === 'confirmed' ? <CheckCircle2 className="h-3 w-3" /> : subscriber.status === 'pending' ? <Clock3 className="h-3 w-3" /> : <UserX className="h-3 w-3" />}{subscriber.status}</span></TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{subscriber.source}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(subscriber.createdAt), 'MMM d, yyyy')}</TableCell>
                <TableCell>{renderActions(subscriber)}</TableCell>
              </TableRow>
            ))}
            {subscribers.length === 0 && <TableRow><TableCell colSpan={5} className="py-14 text-center text-sm text-muted-foreground">No subscribers found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Subscriber pages" className="flex items-center justify-between border-t border-border px-4 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push(listUrl({ page: page - 1 }))} disabled={page <= 1} className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => router.push(listUrl({ page: page + 1 }))} disabled={page >= totalPages} className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </nav>
      )}
    </section>
  );
}
