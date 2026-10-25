import type { Metadata } from 'next';
import Link from 'next/link';
import mongoose from 'mongoose';
import { CheckCircle2, CircleAlert, CircleX } from 'lucide-react';

import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { connectDB } from '@/lib/db/connection';
import { ContactSubmission } from '@/lib/models/ContactSubmission';
import Newsletter from '@/lib/models/Newsletter';
import NewsletterSend from '@/lib/models/NewsletterSend';
import { Post } from '@/lib/models/Post';
import Review from '@/lib/models/Review';
import Comment from '@/lib/models/Comment';
import { livePostFilter } from '@/lib/utils/post-visibility';

export const metadata: Metadata = { title: 'System health | CMS' };
export const dynamic = 'force-dynamic';

type Level = 'ok' | 'warn' | 'fail';
type Check = { label: string; level: Level; detail: string; href?: string };

const set = (name: string) => Boolean(process.env[name]?.trim());

/** Which integrations are configured. Only names are checked, never values. */
function configChecks(): Check[] {
  const group = (label: string, names: string[], missingLevel: Level, purpose: string): Check => {
    const missing = names.filter((name) => !set(name));
    return {
      label,
      level: missing.length ? missingLevel : 'ok',
      detail: missing.length ? `Missing ${missing.join(', ')}. ${purpose}` : `Configured (${names.join(', ')}).`,
    };
  };
  return [
    group('Sign-in', ['NEXTAUTH_SECRET', 'NEXTAUTH_URL'], 'fail', 'Sessions cannot be issued.'),
    group('Email (SMTP)', ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM'], 'fail', 'Verification, receipts and newsletters will not send.'),
    group('Payments', ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], 'fail', 'Checkout or purchase recording will fail.'),
    group('File storage', ['BLOB_READ_WRITE_TOKEN'], 'fail', 'Uploads will fail.'),
    group('Newsletter scheduler', ['CRON_SECRET'], 'warn', 'Scheduled issues will not go out.'),
    group('Unsubscribe links', ['NEWSLETTER_UNSUBSCRIBE_SECRET'], 'warn', 'A key derived from NEXTAUTH_SECRET is used instead.'),
    group('Newsletter footer address', ['NEWSLETTER_POSTAL_ADDRESS'], 'warn', 'Bulk email law (CAN-SPAM) expects a postal address.'),
    group('AI features', ['GROQ_API_KEY'], 'warn', 'Summaries and AI notes are off.'),
    group('Public URL', ['NEXT_PUBLIC_APP_URL'], 'warn', 'Links in emails may point to the wrong host.'),
  ];
}

const relative = (date?: Date | null) => {
  if (!date) return 'never';
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} days ago`;
};

export default async function HealthPage() {
  const checks: Check[] = [];

  let dbOk = false;
  const started = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db?.admin().ping();
    dbOk = true;
    const latency = Date.now() - started;
    checks.push({ label: 'Database', level: latency > 1500 ? 'warn' : 'ok', detail: `Connected · ${latency} ms round trip.` });
  } catch (error) {
    console.error('Health page database check failed', error);
    checks.push({ label: 'Database', level: 'fail', detail: 'Could not connect. Everything that reads content is affected.' });
  }

  const queue: Check[] = [];
  const content: Check[] = [];
  if (dbOk) {
    const [pending, failed, lastSend, active, newMessages, waitingReviews, livePosts, waitingComments, worstIssue] = await Promise.all([
      // Only issues still going out: a cancelled issue's unsent recipients will never send.
      Newsletter.distinct('_id', { status: { $in: ['sending', 'paused'] } }).then((ids) =>
        NewsletterSend.countDocuments({ newsletter: { $in: ids }, status: { $in: ['pending', 'processing'] } }),
      ),
      NewsletterSend.countDocuments({ status: { $in: ['failed', 'bounced'] } }),
      NewsletterSend.findOne({ status: 'sent' }).sort({ sentAt: -1 }).select('sentAt').lean<{ sentAt?: Date }>(),
      Newsletter.find({ status: { $in: ['sending', 'paused', 'scheduled'] } }).select('subject status pausedReason resumeAfter scheduledFor sentCount recipientCount').lean<Array<{ _id: unknown; subject: string; status: string; pausedReason?: string; resumeAfter?: Date; scheduledFor?: Date; sentCount?: number; recipientCount?: number }>>(),
      ContactSubmission.countDocuments({ status: 'new' }),
      Review.countDocuments({ approved: false }),
      Post.find(livePostFilter()).select('title slug excerpt seoDescription coverImage category').lean<Array<{ title: string; slug: string; excerpt?: string; seoDescription?: string; coverImage?: string; category?: string }>>(),
      Comment.countDocuments({ approved: false }),
      Newsletter.findOne({ failedCount: { $gt: 0 } }).sort({ sentAt: -1 }).select('_id').lean<{ _id: unknown }>(),
    ]);

    // Gmail allows roughly 500–2,000 messages a day, far below one issue to the whole list.
    const viaGmail = /gmail|googlemail/i.test(process.env.EMAIL_HOST || '');
    const quotaPaused = active.some((campaign) => /limit|quota|rate/i.test(campaign.pausedReason || ''));

    // The scheduler runs every 10 minutes; a queue that hasn't moved in an hour is stuck.
    // With a daily cap, a quiet hour usually means the cap is used up, so only a quiet day points at the scheduler.
    const quietFor = lastSend?.sentAt ? Date.now() - new Date(lastSend.sentAt).getTime() : Infinity;
    const capped = viaGmail || quotaPaused;
    const stale = pending > 0 && quietFor > 60 * 60 * 1000;
    const stuck = stale && (!capped || quietFor > 26 * 60 * 60 * 1000);
    queue.push({
      label: 'Delivery queue',
      level: stuck ? 'fail' : stale ? 'warn' : 'ok',
      detail:
        `${pending.toLocaleString()} waiting · last email sent ${relative(lastSend?.sentAt)}` +
        (stuck
          ? '. Nothing has gone out for too long: check the scheduler workflow in GitHub Actions.'
          : stale
            ? ". Most likely the provider's daily sending limit is used up; sending continues by itself once it resets."
            : '.'),
      href: '/dashboard/newsletters',
    });
    if (viaGmail || quotaPaused) {
      queue.push({
        label: 'Sending capacity',
        level: 'warn',
        detail:
          `${viaGmail ? 'Newsletters go out through Gmail, whose daily cap is far below your list size' : 'The email provider is hitting its sending limit'}, so each issue takes days. ` +
          'A bulk email service fixes this without code changes: create a Resend or Amazon SES account, verify the sending domain, and set EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASSWORD in Vercel to its SMTP credentials (Resend: smtp.resend.com, port 587, user "resend", password = API key).',
      });
    }
    queue.push({
      label: 'Failed deliveries',
      level: failed > 0 ? 'warn' : 'ok',
      detail: failed > 0 ? `${failed.toLocaleString()} recipients failed or bounced across all issues. Each issue's report groups them by reason and can unsubscribe addresses that don't exist.` : 'None.',
      href: failed > 0 && worstIssue ? `/dashboard/newsletters/${String(worstIssue._id)}/report` : undefined,
    });
    // Campaigns share one quota; a paused one past its resume time waits for the one going out.
    const sendingSubject = active.find((campaign) => campaign.status === 'sending')?.subject;
    for (const campaign of active) {
      const resumeDue = !campaign.resumeAfter || new Date(campaign.resumeAfter).getTime() <= Date.now();
      const queued = campaign.status === 'paused' && resumeDue && sendingSubject;
      queue.push({
        label: `“${campaign.subject}”`,
        level: campaign.status === 'paused' && !queued ? 'warn' : 'ok',
        detail: queued
          ? `Queued: continues after “${sendingSubject}” finishes (issues share one sending quota). ${(campaign.sentCount ?? 0).toLocaleString()} of ${(campaign.recipientCount ?? 0).toLocaleString()} sent so far.`
          : campaign.status === 'paused'
            ? `Paused${campaign.pausedReason ? `: ${campaign.pausedReason}` : ''}${campaign.resumeAfter && !resumeDue ? ` · resumes ${new Date(campaign.resumeAfter).toLocaleString()}` : ' · resumes on the next scheduler run'}`
            : campaign.status === 'scheduled'
              ? `Scheduled for ${campaign.scheduledFor ? new Date(campaign.scheduledFor).toLocaleString() : 'later'}`
              : `Sending · ${(campaign.sentCount ?? 0).toLocaleString()} of ${(campaign.recipientCount ?? 0).toLocaleString()} sent`,
        href: `/dashboard/newsletters/${String(campaign._id)}/report`,
      });
    }

    content.push({ label: 'New messages', level: newMessages ? 'warn' : 'ok', detail: newMessages ? `${newMessages} unread in the inbox.` : 'Inbox is clear.', href: '/dashboard/inbox' });
    content.push({ label: 'Comments waiting', level: waitingComments ? 'warn' : 'ok', detail: waitingComments ? `${waitingComments} waiting for approval.` : 'None waiting.', href: '/dashboard/comments' });
    content.push({ label: 'Reviews waiting', level: waitingReviews ? 'warn' : 'ok', detail: waitingReviews ? `${waitingReviews} waiting for approval.` : 'None waiting.', href: '/dashboard/reviews' });
    const seoGaps = livePosts.filter((post) => !(post.seoDescription || post.excerpt) || !post.category);
    content.push({
      label: 'Post metadata',
      level: seoGaps.length ? 'warn' : 'ok',
      detail: seoGaps.length
        ? `${seoGaps.length} live ${seoGaps.length === 1 ? 'post lacks' : 'posts lack'} a description or category: ${seoGaps.slice(0, 3).map((post) => post.title).join('; ')}${seoGaps.length > 3 ? '…' : ''}`
        : `All ${livePosts.length} live posts have a description and category.`,
      href: '/dashboard/posts',
    });
  }

  const sections: Array<{ title: string; items: Check[] }> = [
    { title: 'Services', items: checks },
    { title: 'Configuration', items: configChecks() },
    { title: 'Newsletter delivery', items: queue },
    { title: 'Needs attention', items: content },
  ].filter((section) => section.items.length);

  const failing = sections.flatMap((section) => section.items).filter((item) => item.level === 'fail').length;
  const warnings = sections.flatMap((section) => section.items).filter((item) => item.level === 'warn').length;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Measure"
        title="System health"
        description={failing ? `${failing} ${failing === 1 ? 'problem needs' : 'problems need'} fixing.` : warnings ? `Running. ${warnings} ${warnings === 1 ? 'thing' : 'things'} to look at.` : 'Everything is running.'}
      />
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="rounded-xl border border-border bg-card">
            <h2 className="border-b border-border px-5 py-4 font-semibold">{section.title}</h2>
            <ul className="divide-y divide-border/70">
              {section.items.map((item) => {
                const Icon = item.level === 'ok' ? CheckCircle2 : item.level === 'warn' ? CircleAlert : CircleX;
                const color = item.level === 'ok' ? 'text-success' : item.level === 'warn' ? 'text-warning' : 'text-destructive';
                const body = (
                  <>
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.label}<span className="sr-only"> ({item.level})</span></span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{item.detail}</span>
                    </span>
                  </>
                );
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <Link href={item.href} className="flex gap-3 px-5 py-4 hover:bg-secondary/50">{body}</Link>
                    ) : (
                      <div className="flex gap-3 px-5 py-4">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
