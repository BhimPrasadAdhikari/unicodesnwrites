'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Edit, BarChart2, Send, Loader2, OctagonX,
} from 'lucide-react';
import { format } from 'date-fns';
import { ConfirmDeleteButton } from '@/components/cms/ConfirmDeleteButton';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface Newsletter {
    _id: string;
    subject: string;
    status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'sent' | 'failed' | 'cancelled';
    recipientCount: number;
    sentCount?: number;
    failedCount?: number;
    pausedReason?: string;
    resumeAfter?: string;
    sentAt?: string;
    scheduledFor?: string;
    updatedAt: string;
    openedCount?: number;
    clickedCount?: number;
}

const DELIVERED_STATUSES = ['sending', 'paused', 'sent', 'failed', 'cancelled'];
const IN_FLIGHT_STATUSES = ['sending', 'paused'];

function StopCampaignButton({ label, onConfirm, onError }: { label: string; onConfirm: () => Promise<void>; onError: (message: string) => void }) {
    const [armed, setArmed] = useState(false);
    const [loading, setLoading] = useState(false);

    const runStop = async () => {
        setLoading(true);
        try {
            await onConfirm();
            setArmed(false);
        } catch (error) {
            onError(error instanceof Error ? error.message : `${label} could not be stopped.`);
        } finally {
            setLoading(false);
        }
    };

    if (armed) {
        return (
            <span className="inline-flex items-center gap-1">
                <button type="button" onClick={runStop} disabled={loading} title="Pending recipients will never receive this campaign" className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-50">
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <OctagonX className="h-3.5 w-3.5" />}
                    Confirm stop
                </button>
                <button type="button" onClick={() => setArmed(false)} disabled={loading} className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Keep sending</button>
            </span>
        );
    }

    return (
        <button type="button" onClick={() => setArmed(true)} aria-label={`Stop ${label}`} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10">
            <OctagonX className="h-3.5 w-3.5" />
            Stop
        </button>
    );
}

/** `sendingAhead`: subject of a campaign still sending, which this paused one waits behind. */
function DeliveryProgress({ newsletter, sendingAhead, now }: { newsletter: Newsletter; sendingAhead?: string; now: number }) {
    const total = newsletter.recipientCount || 0;
    const sent = newsletter.sentCount || 0;
    const failed = newsletter.failedCount || 0;
    const pending = Math.max(0, total - sent - failed);
    const percent = total ? Math.round((sent / total) * 100) : 0;
    return (
        <div className="min-w-44">
            <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">{sent.toLocaleString()} / {total.toLocaleString()} sent</span>
                <span>{percent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Delivery progress">
                <div className="h-full rounded-full bg-foreground" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-1 text-2xs">
                {failed > 0 && <span className="text-destructive">{failed.toLocaleString()} failed · </span>}
                {pending > 0 && <span>{pending.toLocaleString()} {newsletter.status === 'cancelled' ? 'not sent' : 'pending'}</span>}
            </div>
            {newsletter.status === 'paused' && (() => {
                const resumeAt = newsletter.resumeAfter ? new Date(newsletter.resumeAfter) : null;
                // Past its resume time it is only waiting for its turn: campaigns share one
                // sending quota, so the scheduler finishes the older one first.
                if ((!resumeAt || resumeAt.getTime() <= now) && sendingAhead) {
                    return (
                        <div className="mt-1 max-w-56 truncate text-2xs text-muted-foreground" title={`Waiting for “${sendingAhead}” to finish; campaigns share one sending quota.`}>
                            Queued: continues after “{sendingAhead}” finishes
                        </div>
                    );
                }
                return (
                    <div className="mt-1 max-w-56 truncate text-2xs text-warning" title={newsletter.pausedReason}>
                        Paused{resumeAt && resumeAt.getTime() > now ? `, resumes ${format(resumeAt, 'MMM d HH:mm')}` : ', resumes on the next scheduler run'}: {newsletter.pausedReason || 'provider refused mail'}
                    </div>
                );
            })()}
        </div>
    );
}

export default function NewsletterList({ newsletters }: { newsletters: Newsletter[] }) {
    // The campaign currently going out; paused ones past their resume time queue behind it.
    const sendingSubject = newsletters.find((item) => item.status === 'sending')?.subject;
    // Read the clock once per mount, not during every render.
    const [now] = useState(() => Date.now());
    const router = useRouter();
    const [feedback, setFeedback] = useState('');

    const handleStop = async (id: string) => {
        setFeedback('');
        const response = await fetch(`/api/newsletters/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Campaign could not be stopped.');
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        const response = await fetch(`/api/newsletters/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Campaign could not be deleted.');
        router.refresh();
    };

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card/70">
            {feedback && <Alert variant="destructive" className="m-4">{feedback}</Alert>}
            <div className="overflow-x-auto">
                 <Table className="min-w-full divide-y divide-border">
                    <TableHeader>
                        <tr>
                            <TableHead scope="col">
                                Subject
                            </TableHead>
                            <TableHead scope="col">
                                Status
                            </TableHead>
                            <TableHead scope="col">
                                Sent Date
                            </TableHead>
                            <TableHead scope="col">
                                Reach
                            </TableHead>
                            <TableHead scope="col" className="relative">
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody className="bg-card">
                        {newsletters.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                    No newsletters found. Create your first one!
                                </TableCell>
                            </TableRow>
                        ) : (
                            newsletters.map((newsletter) => (
                                <TableRow key={newsletter._id}>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="text-sm font-medium text-foreground truncate max-w-xs" title={newsletter.subject}>
                                            {newsletter.subject}
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            newsletter.status === 'sent' ? 'bg-success/10 text-success' :
                                            newsletter.status === 'scheduled' ? 'bg-warning/10 text-warning' :
                                            newsletter.status === 'draft' ? 'bg-muted text-muted-foreground' :
                                            newsletter.status === 'sending' ? 'bg-secondary text-foreground' :
                                            newsletter.status === 'paused' ? 'bg-warning/10 text-warning' :
                                            newsletter.status === 'cancelled' ? 'bg-muted text-muted-foreground line-through' :
                                            'bg-destructive/10 text-destructive'
                                        }`}>
                                            {newsletter.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                        {newsletter.sentAt
                                            ? format(new Date(newsletter.sentAt), 'MMM d, yyyy HH:mm')
                                            : newsletter.scheduledFor
                                              ? `Scheduled: ${format(new Date(newsletter.scheduledFor), 'MMM d, yyyy HH:mm')}`
                                              : '-'}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                        {DELIVERED_STATUSES.includes(newsletter.status)
                                            ? <DeliveryProgress newsletter={newsletter} sendingAhead={sendingSubject} now={now} />
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-3">
                                            {['draft', 'scheduled'].includes(newsletter.status) && (
                                                <Link 
                                                    href={`/dashboard/newsletters/${newsletter._id}/edit`}
                                                    className="text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            )}
                                            {['draft', 'scheduled', 'sending', 'paused', 'failed'].includes(newsletter.status) && (
                                                <Link
                                                    href={`/dashboard/newsletters/${newsletter._id}/send`}
                                                    className="text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                                                    title={newsletter.status === 'failed' ? 'Review and retry' : 'Review and send'}
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Link>
                                            )}
                                            {DELIVERED_STATUSES.includes(newsletter.status) && (
                                                <Link 
                                                    href={`/dashboard/newsletters/${newsletter._id}/report`}
                                                    className="text-success hover:text-success/80"
                                                >
                                                    <BarChart2 className="h-4 w-4" />
                                                </Link>
                                            )}
                                            {IN_FLIGHT_STATUSES.includes(newsletter.status)
                                                ? <StopCampaignButton label={newsletter.subject} onConfirm={() => handleStop(newsletter._id)} onError={setFeedback} />
                                                : newsletter.status === 'sent'
                                                    ? null
                                                    : <ConfirmDeleteButton compact label={newsletter.subject} onConfirm={() => handleDelete(newsletter._id)} onError={setFeedback} />}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
