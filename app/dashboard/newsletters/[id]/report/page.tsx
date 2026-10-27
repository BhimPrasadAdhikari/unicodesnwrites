import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db/connection';
import Newsletter from '@/lib/models/Newsletter';
import NewsletterSend from '@/lib/models/NewsletterSend';
import Subscriber from '@/lib/models/Subscriber';
import Link from 'next/link';
import { ArrowLeft, BarChart3, CircleAlert, RefreshCw } from 'lucide-react';
import { isValidObjectId } from 'mongoose';
import { AdminRowActions } from '@/components/cms/AdminRowActions';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { mailboxGoneSendFilter } from '@/lib/services/newsletter-delivery';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface RecentSend {
    _id: { toString(): string };
    email: string;
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'bounced';
    sentAt?: Date | string;
    updatedAt?: Date | string;
    failureReason?: string;
}

export default async function CampaignReportPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    if (!isValidObjectId(params.id)) notFound();
    await dbConnect();
    
    // Fetch Newsletter Data
    const newsletter = await Newsletter.findById(params.id).lean();
    if (!newsletter) notFound();
    
    // Aggregated Send Stats
    // NOTE: In production, reading from NewsletterSend for thousands can be slow. 
    // We should rely on aggregates stored in Newsletter model or use efficient aggregation here.
    const totals = await NewsletterSend.aggregate([
        { $match: { newsletter: newsletter._id } },
        { 
            $group: { 
                _id: '$status', 
                count: { $sum: 1 } 
            } 
        }
    ]);
    
    const sent = totals.find(t => t._id === 'sent')?.count || 0;
    const failed = totals.find(t => t._id === 'failed')?.count || 0;
    const bounced = totals.find(t => t._id === 'bounced')?.count || 0;
    const pending = totals.find(t => t._id === 'pending')?.count || 0;
    const processing = totals.find(t => t._id === 'processing')?.count || 0;
    
    // NOTE: Opens/Clicks tracking would need a separate collection or smarter aggregation if tracked via pixel
    // Assuming we have fields in Newsletter model for simplicity (updated by pixel webhook)
    const opened = newsletter.openedCount || 0;
    const clicked = newsletter.clickedCount || 0;
    const recipients = newsletter.recipientCount || sent + failed + bounced + pending + processing;
    
    const openRate = sent > 0 ? (opened / sent * 100).toFixed(1) : 0;
    const clickRate = sent > 0 ? (clicked / sent * 100).toFixed(1) : 0;
    const clickToOpen = opened > 0 ? (clicked / opened * 100).toFixed(1) : 0;
    const deliveryRate = recipients > 0 ? ((sent / recipients) * 100).toFixed(1) : '0.0';

    const recentActivity = await NewsletterSend.find({ newsletter: newsletter._id })
        .sort({ updatedAt: -1 })
        .limit(50)
        .select('email status sentAt failureReason updatedAt')
        .lean() as unknown as RecentSend[];

    // Failures grouped by reason (addresses vary inside SMTP replies, so group on the reason text).
    const failureGroups = failed + bounced > 0
        ? await NewsletterSend.aggregate<{ _id: string; count: number; emails: string[] }>([
            { $match: { newsletter: newsletter._id, status: { $in: ['failed', 'bounced'] } } },
            { $group: { _id: { $substrCP: [{ $ifNull: ['$failureReason', 'No reason recorded'] }, 0, 160] }, count: { $sum: 1 }, emails: { $push: '$email' } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { count: 1, emails: { $slice: ['$emails', 5] } } },
        ])
        : [];
    // Still-subscribed readers whose mailbox doesn't exist (already unsubscribed ones drop out after clean-up).
    const goneCount = failureGroups.length
        ? await Subscriber.countDocuments({
            _id: { $in: await NewsletterSend.distinct('subscriber', { ...mailboxGoneSendFilter(), newsletter: newsletter._id }) },
            status: 'confirmed',
        })
        : 0;

    return (
        <div className="space-y-6">
            <Link href="/dashboard/newsletters" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to campaigns</Link>
            <DashboardPageHeader eyebrow="Delivery signal" title="Campaign report" description="Delivery, engagement, and recipient-level activity for this newsletter campaign." />

            <section className="rounded-xl border border-border bg-card/70 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="text-eyebrow text-primary">Campaign</p><h2 className="mt-2 text-xl font-semibold">{newsletter.subject}</h2></div>
                    <div className="flex flex-wrap items-center gap-2">{failed > 0 && newsletter.status !== 'cancelled' && <Link href={`/dashboard/newsletters/${params.id}/send`} className="inline-flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"><RefreshCw className="h-3.5 w-3.5" /> Retry failures</Link>}<span className={`w-fit rounded-md border px-3 py-1 text-xs font-semibold capitalize ${newsletter.status === 'sent' ? 'border-success/20 bg-success/10 text-success' : 'border-warning/20 bg-warning/10 text-warning'}`}>{newsletter.status}</span></div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                    <span>Sent on {newsletter.sentAt ? new Date(newsletter.sentAt).toLocaleDateString() : '-'}</span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 lg:grid-cols-5">
                    {[
                        { label: 'Recipients', value: recipients, detail: 'Total audience' },
                        { label: 'Sent', value: sent, detail: `${deliveryRate}% delivered` },
                        { label: 'Open rate', value: `${openRate}%`, detail: `${opened} opens` },
                        { label: 'Click rate', value: `${clickRate}%`, detail: `${clicked} clicks · ${clickToOpen}% of opens` },
                        { label: 'Failures', value: failed + bounced, detail: `${pending + processing} pending` },
                    ].map((metric) => <div key={metric.label} className="rounded-xl border border-border bg-background/70 p-4"><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div>)}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    Opens are counted from a tracking image, so they are estimates: some mail apps block images and Apple Mail loads them for everyone. Clicks are exact. Issues sent before tracking was added show zero.
                </p>
            </section>

            {failureGroups.length > 0 && (
                <section className="overflow-hidden rounded-xl border border-border bg-card/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                        <div className="flex items-center gap-3"><CircleAlert className="h-4 w-4 text-destructive" /><h3 className="font-semibold">Why sends failed</h3></div>
                        {goneCount > 0 && (
                            <AdminRowActions
                                actions={[{
                                    label: `Unsubscribe ${goneCount.toLocaleString()} ${goneCount === 1 ? 'address that doesn’t' : 'addresses that don’t'} exist`,
                                    url: '/api/admin/subscribers/suppress-bounced',
                                    method: 'POST',
                                    body: { newsletterId: params.id },
                                    confirm: 'Confirm unsubscribe',
                                    successMessage: (data) => `${Number(data.unsubscribed || 0).toLocaleString()} unsubscribed and tagged “bounced”.`,
                                }]}
                            />
                        )}
                    </div>
                    <ul className="divide-y divide-border/70">
                        {failureGroups.map((group) => (
                            <li key={group._id} className="px-5 py-4 text-sm">
                                <p className="flex gap-3"><span className="w-14 shrink-0 font-semibold tabular-nums">{group.count.toLocaleString()}</span><span className="min-w-0 break-words text-muted-foreground">{group._id}</span></p>
                                <p className="mt-1 pl-[4.25rem] text-xs text-muted-foreground/80">{group.emails.join(', ')}{group.count > group.emails.length ? ', …' : ''}</p>
                            </li>
                        ))}
                    </ul>
                    <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                        Addresses whose mailbox doesn’t exist are unsubscribed automatically from now on. Quota and connection errors are not the reader’s fault:{' '}
                        {newsletter.status === 'cancelled'
                            ? 'this issue was stopped, so it cannot be retried. To reach these readers, include its posts in your next issue.'
                            : 'use Retry failures to send to them again.'}
                    </p>
                </section>
            )}

             <section className="overflow-hidden rounded-xl border border-border bg-card/70">
                <div className="flex items-center gap-3 border-b border-border px-5 py-4"><BarChart3 className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold">Recent activity</h3></div>

                {recentActivity.length === 0 ? (
                    <div className="p-12 text-center text-sm text-muted-foreground">No send activity recorded yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table className="min-w-[720px]">
                            <TableHeader className="text-left">
                                <tr><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead>Details</TableHead></tr>
                            </TableHeader>
                            <TableBody>
                                {recentActivity.map((entry) => (
                                    <TableRow key={entry._id.toString()}>
                                        <TableCell className="font-medium">{entry.email}</TableCell>
                                        <TableCell><span className={`rounded-md border px-2.5 py-1 text-2xs font-semibold capitalize ${entry.status === 'sent' ? 'border-success/20 bg-success/10 text-success' : entry.status === 'pending' || entry.status === 'processing' ? 'border-warning/20 bg-warning/10 text-warning' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}>{entry.status}</span></TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(entry.updatedAt || entry.sentAt || 0).toLocaleString()}</TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground">{entry.failureReason || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
             </section>
        </div>
    );
}
