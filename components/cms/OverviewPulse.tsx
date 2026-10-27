import Link from 'next/link';
import { ArrowUpRight, Inbox, MessageSquare, PenLine, Send, Star } from 'lucide-react';
import Comment from '@/lib/models/Comment';

import { connectDB } from '@/lib/db/connection';
import { Analytics } from '@/lib/models/Analytics';
import { ContactSubmission } from '@/lib/models/ContactSubmission';
import Newsletter from '@/lib/models/Newsletter';
import { Post } from '@/lib/models/Post';
import Purchase from '@/lib/models/Purchase';
import Review from '@/lib/models/Review';
import Subscriber from '@/lib/models/Subscriber';

const DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type DailyRow = { _id: string; count: number };

/** Fill missing days with zero so every chart has the same 30 slots. */
function series(rows: DailyRow[], start: Date) {
  const byDay = new Map(rows.map((row) => [row._id, row.count]));
  return Array.from({ length: DAYS }, (_, i) => {
    const day = new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { day, value: byDay.get(day) ?? 0 };
  });
}

const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** One measure, one axis: thin daily bars in ink, a native tooltip per bar and a table for screen readers. */
function DailyBars({ title, total, points, unit }: { title: string; total: string; points: { day: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 300;
  const height = 72;
  const slot = width / points.length;
  const bar = Math.max(3, slot - 2); // 2px surface gap between bars
  return (
    <figure className="rounded-xl border border-border bg-card p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{title}</span>
        <span className="font-serif text-2xl font-medium">{total}</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height + 2}`} className="mt-4 h-20 w-full" role="img" aria-label={`${title}, daily for the last ${DAYS} days`} preserveAspectRatio="none">
        <line x1="0" x2={width} y1={height + 1} y2={height + 1} className="stroke-border" strokeWidth="1" />
        {points.map((point, i) => {
          const h = point.value === 0 ? 0 : Math.max(2, (point.value / max) * height);
          return (
            <g key={point.day}>
              {/* Hit target spans the whole slot, taller than the bar */}
              <rect x={i * slot} y={0} width={slot} height={height} fill="transparent">
                <title>{`${dayLabel(point.day)}: ${point.value.toLocaleString()} ${unit}`}</title>
              </rect>
              {h > 0 ? <rect x={i * slot + (slot - bar) / 2} y={height - h} width={bar} height={h} rx={Math.min(2, bar / 2)} className="fill-foreground/80 pointer-events-none" /> : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{dayLabel(points[0].day)}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>{title} per day</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.day}><th scope="row">{dayLabel(point.day)}</th><td>{point.value}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const perDay = (dateField: string) => ({ $dateToString: { format: '%Y-%m-%d', date: `$${dateField}`, timezone: 'UTC' } });

export default async function OverviewPulse() {
  try {
    return await renderPulse();
  } catch (error) {
    console.error('Overview pulse failed', error);
    return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Trends couldn&apos;t load. Refresh to try again.</p>;
  }
}

async function renderPulse() {
  await connectDB();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (DAYS - 1) * DAY_MS);

  const [views, subscribers, sales, topPages, newMessages, waitingReviews, drafts, scheduledPosts, liveIssues, waitingComments] = await Promise.all([
    Analytics.aggregate<DailyRow>([
      { $match: { event: 'page_view', timestamp: { $gte: start } } },
      { $group: { _id: perDay('timestamp'), count: { $sum: 1 } } },
    ]),
    Subscriber.aggregate<DailyRow>([
      { $match: { status: 'confirmed', $or: [{ confirmedAt: { $gte: start } }, { confirmedAt: null, createdAt: { $gte: start } }] } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$confirmedAt', '$createdAt'] }, timezone: 'UTC' } }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate<DailyRow & { cents: number }>([
      { $match: { status: 'completed', purchasedAt: { $gte: start } } },
      { $group: { _id: perDay('purchasedAt'), count: { $sum: 1 }, cents: { $sum: '$amount' } } },
    ]),
    Analytics.aggregate<{ _id: string; views: number }>([
      { $match: { event: 'page_view', timestamp: { $gte: start }, page: { $regex: '^/blog/[^/?#]+$' } } },
      { $group: { _id: '$page', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 5 },
    ]),
    ContactSubmission.countDocuments({ status: 'new' }),
    Review.countDocuments({ approved: false }),
    Post.countDocuments({ published: false }),
    Post.countDocuments({ published: true, publishedAt: { $gt: now } }),
    Newsletter.countDocuments({ status: { $in: ['scheduled', 'sending', 'paused'] } }),
    Comment.countDocuments({ approved: false }),
  ]);

  const slugs = topPages.map((row) => row._id.replace('/blog/', ''));
  const titles = new Map(
    (await Post.find({ slug: { $in: slugs } }).select('slug title').lean<Array<{ slug: string; title: string }>>()).map((post) => [post.slug, post.title])
  );

  const viewPoints = series(views, start);
  const subscriberPoints = series(subscribers, start);
  const salesPoints = series(sales, start);
  const revenueCents = sales.reduce((sum, row) => sum + (row.cents || 0), 0);

  const attention = [
    { label: 'New messages', value: newMessages, href: '/dashboard/inbox?status=new', icon: Inbox },
    { label: 'Reviews to approve', value: waitingReviews, href: '/dashboard/reviews', icon: Star },
    { label: 'Comments to approve', value: waitingComments, href: '/dashboard/comments', icon: MessageSquare },
    { label: 'Drafts', value: drafts, href: '/dashboard/posts', icon: PenLine },
    { label: 'Scheduled posts', value: scheduledPosts, href: '/dashboard/posts', icon: PenLine },
    { label: 'Issues in flight', value: liveIssues, href: '/dashboard/newsletters', icon: Send },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Needs your attention" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {attention.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href} className="flex items-center justify-between gap-3 bg-card p-4 transition-colors hover:bg-secondary/60">
            <span className="min-w-0">
              <span className="block font-serif text-2xl font-medium">{value}</span>
              <span className="block truncate text-xs text-muted-foreground">{label}</span>
            </span>
            <Icon className={`h-4 w-4 shrink-0 ${value > 0 && (label === 'New messages' || label === 'Reviews to approve' || label === 'Comments to approve') ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <DailyBars title="Page views · 30 days" total={viewPoints.reduce((sum, p) => sum + p.value, 0).toLocaleString()} points={viewPoints} unit="views" />
        <DailyBars title="New subscribers · 30 days" total={subscriberPoints.reduce((sum, p) => sum + p.value, 0).toLocaleString()} points={subscriberPoints} unit="subscribers" />
        <DailyBars title="Sales · 30 days" total={`${salesPoints.reduce((sum, p) => sum + p.value, 0)} · $${(revenueCents / 100).toFixed(2)}`} points={salesPoints} unit="sales" />
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Most-read posts · 30 days</h2>
          <Link href="/dashboard/analytics/content" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">All content <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        {topPages.length ? (
          <ol className="divide-y divide-border/70">
            {topPages.map((row, index) => {
              const slug = row._id.replace('/blog/', '');
              const share = topPages[0].views ? Math.round((row.views / topPages[0].views) * 100) : 0;
              return (
                <li key={row._id} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-5 font-mono text-[12px] text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <Link href={row._id} target="_blank" className="block truncate text-sm font-medium hover:text-primary">{titles.get(slug) || slug}</Link>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-foreground/70" style={{ width: `${share}%` }} /></span>
                  </span>
                  <span className="shrink-0 font-mono text-sm">{row.views.toLocaleString()}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-5 py-6 text-sm text-muted-foreground">No post views recorded in the last 30 days.</p>
        )}
      </section>
    </div>
  );
}
