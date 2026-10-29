import Link from 'next/link';
import dbConnect from '@/lib/db/connection';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import WelcomeSeriesEditor from '@/components/cms/WelcomeSeriesEditor';
import { getWelcomeSeriesSettings, getWelcomeSeriesStats } from '@/lib/services/welcome-series';

export default async function WelcomeSeriesPage() {
    await dbConnect();
    const [settings, stats] = await Promise.all([getWelcomeSeriesSettings(), getWelcomeSeriesStats()]);

    const tiles = [
        { label: 'Status', value: settings.enabled ? 'On' : 'Off' },
        { label: 'Mid-series', value: stats.inProgress.toLocaleString() },
        { label: 'Sent, last 7 days', value: stats.sentLast7Days.toLocaleString() },
        { label: 'Failed, last 7 days', value: stats.failedLast7Days.toLocaleString() },
    ];

    return (
        <div className="space-y-6">
            <DashboardPageHeader
                eyebrow="Email Marketing"
                title="Welcome series"
                description="Three emails over a reader's first week, pointing them to the right content for where they signed up. Off until you turn it on."
                action={
                    <Link href="/dashboard/newsletters" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary transition-colors">
                        Back to campaigns
                    </Link>
                }
            />

            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <div key={tile.label} className="rounded-xl border border-border bg-card p-4">
                        <dt className="text-2xs text-muted-foreground">{tile.label}</dt>
                        <dd className="mt-1 font-mono text-2xl">{tile.value}</dd>
                    </div>
                ))}
            </dl>
            <p className="text-xs text-muted-foreground">
                Counts cover the day 2 and day 6 emails, sent by the newsletter scheduler after any campaigns (up to 100 per run).
            </p>

            <WelcomeSeriesEditor settings={settings} />
        </div>
    );
}
