import { Metadata } from 'next';
import dbConnect from '@/lib/db/connection';
import Subscriber from '@/lib/models/Subscriber';
import SubscriberList from '@/components/cms/SubscriberList';
import SubscriberImport from '@/components/cms/SubscriberImport';
import { Users, UserPlus, UserMinus, TrendingUp } from 'lucide-react';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import type { ISubscriber } from '@/lib/models/Subscriber';
import { cleanSingleLine } from '@/lib/utils/sanitize';

interface SubscriberQuery {
    status?: ISubscriber['status'];
    $or?: Array<
        | { email: { $regex: string; $options: 'i' } }
        | { name: { $regex: string; $options: 'i' } }
    >;
}

export const metadata: Metadata = {
    title: 'Subscribers | CMS',
};

export default async function SubscribersPage(props: {
    searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
    await dbConnect();

    const searchParams = await props.searchParams;
    const requestedPage = Number.parseInt(searchParams.page || '1', 10);
    const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), 10_000) : 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Filters
    const query: SubscriberQuery = {};
    const search = cleanSingleLine(searchParams.q || '').slice(0, 254);
    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            { email: { $regex: escapedSearch, $options: 'i' } },
            { name: { $regex: escapedSearch, $options: 'i' } },
        ];
    }
    const allowedStatuses = new Set<ISubscriber['status']>(['pending', 'confirmed', 'unsubscribed']);
    if (searchParams.status && allowedStatuses.has(searchParams.status as ISubscriber['status'])) {
        query.status = searchParams.status as ISubscriber['status'];
    }

    // Data Fetching
    const [subscribers, totalCount, globalStats, recentStats] = await Promise.all([
        Subscriber.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Subscriber.countDocuments(query),
        Subscriber.aggregate<{ _id: ISubscriber['status']; count: number }>([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]),
        Subscriber.aggregate<{ count: number }>([
            {
                $match: {
                    $expr: {
                        $gte: ['$createdAt', { $dateSubtract: { startDate: '$$NOW', unit: 'day', amount: 30 } }],
                    },
                },
            },
            { $count: 'count' },
        ]),
    ]);

    const globalConfirmed = globalStats.find((stat) => stat._id === 'confirmed')?.count || 0;
    const globalPending = globalStats.find((stat) => stat._id === 'pending')?.count || 0;
    const globalUnsubscribed = globalStats.find((stat) => stat._id === 'unsubscribed')?.count || 0;
    const recentCount = recentStats[0]?.count || 0;

    // Serialize for Client Component
    const serializedSubscribers = subscribers.map((sub) => ({
        ...sub,
        _id: sub._id.toString(),
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        confirmedAt: sub.confirmedAt?.toISOString(),
        subscribedAt: sub.subscribedAt?.toISOString(),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="space-y-6">
            <DashboardPageHeader
                eyebrow="Audience & Community"
                title="Newsletter Subscribers"
                description="Search, segment, import, export, and manage your newsletter subscribers and audience growth."
            />

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-card text-card-foreground p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Confirmed Subscribers</p>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-serif font-medium">{globalConfirmed}</div>
                    <p className="text-xs text-muted-foreground">Confirmed active users</p>
                </div>
                <div className="rounded-lg border bg-card text-card-foreground p-6">
                     <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                        <UserPlus className="h-4 w-4 text-warning" />
                    </div>
                    <div className="text-2xl font-serif font-medium">{globalPending}</div>
                    <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
                </div>
                <div className="rounded-lg border bg-card text-card-foreground p-6">
                     <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Unsubscribed</p>
                        <UserMinus className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="text-2xl font-serif font-medium">{globalUnsubscribed}</div>
                    <p className="text-xs text-muted-foreground">Opted out</p>
                </div>
                 <div className="rounded-lg border bg-card text-card-foreground p-6">
                     <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">New subscribers</p>
                        <TrendingUp className="h-4 w-4 text-success" />
                    </div>
                    <div className="text-2xl font-serif font-medium">+{recentCount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
            </div>

            <details className="group rounded-lg border border-border bg-card">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-medium">
                    Import subscribers from CSV
                    <span className="font-mono text-[12px] text-muted-foreground">columns: email, name</span>
                </summary>
                <div className="border-t border-border p-5">
                    <p className="mb-4 text-sm text-muted-foreground">
                        Imported addresses are added as confirmed, so only import people who agreed to hear from you. Addresses already on the list, including anyone who unsubscribed, are left alone, and addresses you deleted are skipped until the person subscribes again themselves.
                    </p>
                    <SubscriberImport />
                </div>
            </details>

            <SubscriberList 
                // Remount on navigation so the list doesn't keep the previous page's rows.
                key={`${page}-${search}-${query.status ?? 'all'}`}
                search={search}
                statusFilter={query.status ?? ''}
                subscribers={serializedSubscribers}
                totalCount={totalCount}
                page={page}
                totalPages={totalPages}
            />
        </div>
    );
}
