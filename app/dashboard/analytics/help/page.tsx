import { Activity, BookOpen, Gauge, ShieldCheck } from 'lucide-react';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

const metrics = [
  { title: 'Unique visitors', description: 'Distinct anonymous visitor identifiers observed during the selected period.' },
  { title: 'Page views', description: 'Successful page-view events recorded across the publication.' },
  { title: 'Bounce rate', description: 'The share of measured sessions containing a single page view.' },
  { title: 'Average session duration', description: 'Average elapsed time between the first and last measured event in a session.' },
];

const events = [
  ['page_view', 'A public page is viewed.'],
  ['newsletter_signup', 'A newsletter form is seen or submitted.'],
  ['newsletter_signup_confirmed', 'A reader confirms double opt-in.'],
  ['product_buy_click', 'A reader starts product checkout.'],
  ['contact_form_submit', 'The correspondence form is submitted.'],
  ['product_download', 'A purchased file is requested.'],
];

export default function AnalyticsHelpPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <DashboardPageHeader eyebrow="Documentation" title="Analytics & Telemetry Guide" description="How platform events, sessions, and visitor engagement metrics are collected, measured, and protected." />

      <section className="rounded-xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">How measurement works</h2></div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">A lightweight first-party script records publication events and associates them with an anonymous browser session identifier stored locally. The dashboard reports aggregated reading behavior; it is not intended to identify individual readers.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[['Tracking', 'The public analytics script sends explicitly named events.'], ['Sessions', 'A random local identifier groups activity into a reading session.'], ['Controls', 'Readers can inspect and delete linked session data from the privacy page.']].map(([title, description]) => <article key={title} className="rounded-xl border border-border bg-background/70 p-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></article>)}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Metric definitions</h2></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">{metrics.map((metric) => <article key={metric.title} className="rounded-xl border border-border bg-background/70 p-4"><h3 className="text-sm font-semibold">{metric.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.description}</p></article>)}</div>
      </section>

      <section className="rounded-xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="flex items-center gap-3"><Activity className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Tracked product events</h2></div>
        <div className="mt-5 divide-y divide-border/70 overflow-hidden rounded-xl border border-border">{events.map(([name, description]) => <div key={name} className="grid gap-1 bg-background/70 px-4 py-3 sm:grid-cols-[220px_1fr]"><code className="font-mono text-xs font-semibold text-foreground">{name}</code><p className="text-sm text-muted-foreground">{description}</p></div>)}</div>
      </section>

      <aside className="flex items-start gap-3 rounded-xl border border-border bg-secondary p-5 text-sm leading-6 text-foreground"><BookOpen className="mt-0.5 h-5 w-5 shrink-0" /><p>Use trends as editorial clues, not absolute truth. Ad blockers, disabled JavaScript, network failures, and privacy settings can all reduce measured activity.</p></aside>
    </div>
  );
}
