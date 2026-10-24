import SalesAnalytics from '@/components/cms/SalesAnalytics';
import dbConnect from '@/lib/db/connection';
import Purchase from '@/lib/models/Purchase';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const dynamic = 'force-dynamic';

async function getMetrics() {
  await dbConnect();

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [stats] = await Purchase.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' }, // stored in cents
        totalSales: { $sum: 1 },
      }
    }
  ]);

  const monthlyAggregation = await Purchase.aggregate([
    {
      $match: {
        status: 'completed',
        purchasedAt: { $gte: start, $lte: now },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$purchasedAt' },
          month: { $month: '$purchasedAt' },
        },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const match = monthlyAggregation.find(
      (row) => `${row._id.year}-${row._id.month}` === key
    );

    return {
      name: monthFormatter.format(date),
      revenue: match ? match.revenue : 0,
    };
  });

  return {
    totalRevenue: stats?.totalRevenue || 0,
    totalSales: stats?.totalSales || 0,
    averageOrderValue: stats?.totalSales ? stats.totalRevenue / stats.totalSales : 0,
    monthlyRevenue,
  };
}

export default async function SalesPage() {
  const metrics = await getMetrics();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Revenue & Performance"
        title="Sales Analytics"
        description="Detailed analytics of completed revenue, order volume, and monthly product performance."
      />

      <SalesAnalytics metrics={metrics} />
    </div>
  );
}
