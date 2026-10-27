'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Loader2, Mail, OctagonX, Send, Users } from 'lucide-react';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { subscribeSchema } from '@/lib/utils/validations/newsletter';
import { Alert } from '@/components/ui/Alert';

interface NewsletterCampaign {
  _id: string;
  subject: string;
  previewText?: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'sent' | 'failed' | 'cancelled';
  pausedReason?: string;
  resumeAfter?: string | null;
  scheduledFor?: string | null;
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  sentAt?: string;
}

type Feedback = { type: 'success' | 'error' | 'info'; message: string };

const statusStyles: Record<NewsletterCampaign['status'], string> = {
  draft: 'border-border bg-muted text-muted-foreground',
  scheduled: 'border-warning/20 bg-warning/10 text-warning',
  sending: 'border-border bg-secondary text-foreground',
  paused: 'border-warning/20 bg-warning/10 text-warning',
  cancelled: 'border-border bg-muted text-muted-foreground',
  sent: 'border-success/20 bg-success/10 text-success',
  failed: 'border-destructive/20 bg-destructive/10 text-destructive',
};

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export default function SendNewsletterPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const [newsletter, setNewsletter] = useState<NewsletterCampaign | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  // Lets Stop end the send loop below without it reporting the stopped campaign as an error.
  const stoppedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      try {
        const [campaignResponse, countResponse] = await Promise.all([
          fetch(`/api/newsletters/${encodeURIComponent(params.id)}`),
          fetch('/api/subscribers/count?status=confirmed'),
        ]);
        if (!campaignResponse.ok) throw new Error('Campaign could not be loaded.');
        if (!countResponse.ok) throw new Error('Subscriber count could not be loaded.');

        const campaign = await campaignResponse.json() as NewsletterCampaign;
        const count = await countResponse.json() as { count?: number };
        setNewsletter(campaign);
        setScheduleAt(toLocalDateTimeInput(campaign.scheduledFor));
        setSubscriberCount(typeof count.count === 'number' ? count.count : 0);
      } catch (error) {
        setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Campaign data could not be loaded.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleSendTest = async () => {
    const validation = subscribeSchema.safeParse({ email: testEmail, source: 'api' });
    if (!validation.success) {
      setFeedback({ type: 'error', message: validation.error.issues[0]?.message || 'Enter a valid test email.' });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/newsletters/${encodeURIComponent(params.id)}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validation.data.email }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Test email could not be sent.');
      setTestEmail(validation.data.email);
      setFeedback({ type: 'success', message: payload?.message || `Test email sent to ${validation.data.email}.` });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Test email could not be sent.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendNow = async (force = false, retryFailed = false) => {
    if (!confirmSend) {
      setConfirmSend(true);
      setFeedback({ type: 'info', message: 'Confirm the audience and irreversible send action below.' });
      return;
    }

    setIsSending(true);
    setFeedback(null);
    try {
      // The API sends one batch per request; keep requesting batches until the
      // queue drains, the provider pushes back, or nothing more is due right now.
      let firstRequest = true;
      let totalProcessed = 0;
      stoppedRef.current = false;
      for (;;) {
        if (stoppedRef.current) break;
        const query = new URLSearchParams({ batchSize: '100' });
        if (firstRequest && force) query.set('force', 'true');
        if (firstRequest && retryFailed) query.set('retryFailed', 'true');
        firstRequest = false;
        const response = await fetch(`/api/newsletters/${encodeURIComponent(params.id)}/send?${query}`, { method: 'POST' });
        const data = await response.json().catch(() => ({}));
        if (stoppedRef.current) break;
        if (!response.ok) throw new Error(data.error || 'Campaign batch could not be processed.');
        totalProcessed += data.processedCount || 0;

        setNewsletter((previous) => previous ? {
          ...previous,
          status: data.status,
          recipientCount: data.recipientCount,
          sentCount: data.sentCount,
          failedCount: data.failedCount,
          sentAt: previous.sentAt || new Date().toISOString(),
          pausedReason: data.status === 'paused' ? data.providerError : undefined,
          resumeAfter: data.status === 'paused' ? data.resumeAfter : null,
        } : previous);

        if (data.providerError) {
          const resumeAt = data.resumeAfter ? ` around ${new Date(data.resumeAfter).toLocaleString()}` : '';
          setFeedback({ type: 'error', message: `${data.providerError} Paused with ${data.pendingCount} recipients still queued. The scheduler resumes it automatically${resumeAt}; you can close this tab.` });
          break;
        }
        if (data.pendingCount > 0 && data.processedCount > 0) {
          setFeedback({ type: 'info', message: `Sending… ${data.sentCount} sent, ${data.pendingCount} remaining. If you close this tab, the scheduler continues in the background.` });
          continue;
        }
        setFeedback({
          type: data.failedCount > 0 || data.pendingCount > 0 ? 'info' : 'success',
          message: data.pendingCount > 0
            ? `Processed ${totalProcessed} recipients. ${data.pendingCount} are waiting to retry and will be picked up by the scheduler.`
            : `Campaign complete: ${data.sentCount} sent, ${data.failedCount} failed.`,
        });
        if (data.pendingCount === 0) router.refresh();
        break;
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Campaign could not be sent.' });
    } finally {
      // Success or failure, the next click asks for confirmation again.
      setConfirmSend(false);
      setIsSending(false);
    }
  };

  const handleStop = async () => {
    if (!confirmStop) {
      setConfirmStop(true);
      setFeedback({ type: 'info', message: 'Stop this campaign? Recipients still pending will never receive it. This cannot be undone.' });
      return;
    }
    setIsStopping(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/newsletters/${encodeURIComponent(params.id)}/cancel`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Campaign could not be stopped.');
      stoppedRef.current = true;
      setNewsletter((previous) => previous ? { ...previous, status: 'cancelled', sentCount: data.sentCount, failedCount: data.failedCount, pausedReason: undefined, resumeAfter: null } : previous);
      setFeedback({ type: 'success', message: `Campaign stopped. ${data.sentCount} were sent; ${data.pendingCount} pending recipients will not be emailed.` });
      setConfirmStop(false);
      router.refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Campaign could not be stopped.' });
    } finally {
      setIsStopping(false);
    }
  };

  const handleSchedule = async () => {
    const scheduledDate = new Date(scheduleAt);
    if (!scheduleAt || Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      setFeedback({ type: 'error', message: 'Choose a valid future date and time.' });
      return;
    }

    setIsScheduling(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/newsletters/${encodeURIComponent(params.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'scheduled', scheduledFor: scheduledDate.toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Campaign could not be scheduled.');
      setNewsletter(data);
      setScheduleAt(toLocalDateTimeInput(data.scheduledFor));
      setFeedback({ type: 'success', message: `Campaign scheduled for ${new Date(data.scheduledFor).toLocaleString()}.` });
      router.refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Campaign could not be scheduled.' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnschedule = async () => {
    setIsScheduling(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/newsletters/${encodeURIComponent(params.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', scheduledFor: null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Campaign could not be returned to draft.');
      setNewsletter(data);
      setScheduleAt('');
      setFeedback({ type: 'success', message: 'Campaign moved back to draft.' });
      router.refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Campaign could not be unscheduled.' });
    } finally {
      setIsScheduling(false);
    }
  };

  if (isLoading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-label="Loading campaign" /></div>;
  if (!newsletter) return <div className="rounded-xl border border-border bg-card p-10 text-center"><p className="font-semibold">Campaign unavailable</p><p className="mt-2 text-sm text-muted-foreground">{feedback?.message || 'This campaign could not be found.'}</p></div>;

  const isScheduled = newsletter.status === 'scheduled';
  const isPaused = newsletter.status === 'paused';
  const isSendingState = newsletter.status === 'sending' || isPaused;
  const isSent = newsletter.status === 'sent';
  const isFailed = newsletter.status === 'failed';
  const isCancelled = newsletter.status === 'cancelled';
  const hasRetryableFailures = (newsletter.failedCount || 0) > 0 && (isSent || isFailed || isSendingState);
  const canSchedule = !isSendingState && !isSent && !isCancelled;
  const audience = subscriberCount ?? newsletter.recipientCount ?? 0;
  const scheduleDisplay = newsletter.scheduledFor ? new Date(newsletter.scheduledFor).toLocaleString() : 'Not scheduled';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to editor</button>

      <DashboardPageHeader
        eyebrow="Delivery desk"
        title="Review and send"
        description="Test the message, confirm the audience, then schedule or deliver the campaign in controlled batches."
        action={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold capitalize ${statusStyles[newsletter.status]}`}>{newsletter.status}</span>
            {isSendingState && (confirmStop ? (
              <>
                <button type="button" onClick={handleStop} disabled={isStopping} className="inline-flex h-9 items-center gap-2 rounded-xl bg-destructive px-3 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50">{isStopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <OctagonX className="h-4 w-4" />} Confirm stop</button>
                <button type="button" onClick={() => setConfirmStop(false)} disabled={isStopping} className="text-xs font-semibold underline underline-offset-2">Keep sending</button>
              </>
            ) : (
              <button type="button" onClick={handleStop} className="inline-flex h-9 items-center gap-2 rounded-xl border border-destructive/30 bg-background px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"><OctagonX className="h-4 w-4" /> Stop campaign</button>
            ))}
          </div>
        )}
      />

      {feedback && (
        <Alert role="status" variant={feedback.type === 'success' ? 'success' : feedback.type === 'error' ? 'destructive' : 'info'}>{feedback.message}</Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card/70">
          <header className="border-b border-border p-5"><p className="text-eyebrow text-primary">Inbox preview</p><h2 className="mt-2 text-lg font-semibold">{newsletter.subject}</h2>{newsletter.previewText && <p className="mt-2 text-sm text-muted-foreground">{newsletter.previewText}</p>}</header>
          <iframe title="Sandboxed newsletter preview" srcDoc={newsletter.content} sandbox="" className="h-[620px] w-full bg-white" />
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-card/70 p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Audience</h2><Users className="h-4 w-4 text-muted-foreground" /></div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{audience.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">Confirmed subscribers</p>
            {(isSendingState || isSent || isFailed || isCancelled) && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Sent {newsletter.sentCount || 0} · Failed {newsletter.failedCount || 0} · Pending {Math.max(0, (newsletter.recipientCount || 0) - (newsletter.sentCount || 0) - (newsletter.failedCount || 0))}</p>}
            {isPaused && <p className="mt-2 text-xs text-warning">Paused{newsletter.resumeAfter ? ` until ${new Date(newsletter.resumeAfter).toLocaleString()}` : ''}: {newsletter.pausedReason || 'the email provider refused mail.'}</p>}
          </section>

          <section className="rounded-xl border border-border bg-card/70 p-5">
            <h2 className="font-semibold">Send a test</h2>
            <label htmlFor="test-email" className="sr-only">Test email address</label>
            <input id="test-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="editor@example.com" className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15" />
            <button type="button" onClick={handleSendTest} disabled={isTesting} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted disabled:opacity-50">{isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send test</button>
          </section>

          <section className="rounded-xl border border-border bg-card/70 p-5">
            <h2 className="font-semibold">Delivery</h2>
            <label htmlFor="schedule-at" className="mt-4 block text-eyebrow text-muted-foreground">Schedule for later</label>
            <input id="schedule-at" type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} disabled={!canSchedule || isScheduling} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50" />
            <p className="mt-2 text-xs text-muted-foreground">Current: {scheduleDisplay}</p>

            {confirmSend && (
              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs leading-5 text-destructive">
                This will deliver to {audience.toLocaleString()} subscribers. Sending cannot be undone.
                <button type="button" onClick={() => setConfirmSend(false)} className="mt-2 block font-semibold underline underline-offset-2">Cancel send</button>
              </div>
            )}

            {hasRetryableFailures ? <button type="button" onClick={() => handleSendNow(false, true)} disabled={isSending} className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${confirmSend ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{confirmSend ? 'Confirm retry' : `Retry ${newsletter.failedCount} failures`}</button> : <button type="button" onClick={() => handleSendNow(isScheduled)} disabled={isSending || isSent || isCancelled} className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmSend ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{confirmSend ? 'Confirm and send' : isPaused ? 'Resume now' : isSendingState ? 'Process next batch' : isCancelled ? 'Stopped' : isScheduled ? 'Send now instead' : 'Send now'}</button>}
            <button type="button" onClick={isScheduled ? handleUnschedule : handleSchedule} disabled={isScheduling || !canSchedule} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">{isScheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}{isScheduled ? 'Move back to draft' : 'Schedule campaign'}</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
