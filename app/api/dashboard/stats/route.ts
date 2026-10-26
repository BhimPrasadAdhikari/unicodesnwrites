import { NextResponse } from 'next/server';
import { formatCurrency } from '@/lib/utils/currency';
import { requireAdminResponse } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import Purchase from '@/lib/models/Purchase';
import Subscriber from '@/lib/models/Subscriber';
import { Post } from '@/lib/models/Post';
import Product from '@/lib/models/Product';
import { Analytics } from '@/lib/models/Analytics';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function sumPurchases(match: Record<string, unknown>) {
  const [row] = await Purchase.aggregate<{ total: number; count: number }>([
    { $match: { status: 'completed', ...match } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } }, count: { $sum: 1 } } },
  ]);
  return { total: row?.total ?? 0, count: row?.count ?? 0 };
}

export async function GET() {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    await connectDB();

    // Compare the last 30 days with the 30 days before, so a month that has
    // only just started is not measured against a whole previous month.
    const now = Date.now();
    const windowStart = new Date(now - WINDOW_DAYS * DAY_MS);
    const previousStart = new Date(now - 2 * WINDOW_DAYS * DAY_MS);
    const current = { $gte: windowStart };
    const previous = { $gte: previousStart, $lt: windowStart };

    // Imported subscribers may have no confirmedAt; fall back to when the record was created.
    const joinedIn = (range: Record<string, Date>) => ({
      status: 'confirmed' as const,
      $or: [{ confirmedAt: range }, { confirmedAt: null, createdAt: range }],
    });

    const [
      allPurchases,
      currentPurchases,
      previousPurchases,
      totalSubscribers,
      confirmedSubscribers,
      currentSubscribers,
      previousSubscribers,
      totalArticles,
      totalViews,
      currentViews,
      previousViews,
    ] = await Promise.all([
      sumPurchases({}),
      sumPurchases({ purchasedAt: current }),
      sumPurchases({ purchasedAt: previous }),
      Subscriber.countDocuments(),
      Subscriber.countDocuments({ status: 'confirmed' }),
      Subscriber.countDocuments(joinedIn(current)),
      Subscriber.countDocuments(joinedIn(previous)),
      Post.countDocuments({ published: true }),
      Analytics.countDocuments({ event: 'page_view' }),
      Analytics.countDocuments({ event: 'page_view', timestamp: current }),
      Analytics.countDocuments({ event: 'page_view', timestamp: previous }),
    ]);

    let totalRevenueCents = allPurchases.total;
    let totalSalesCount = allPurchases.count;

    // Fallback: If no completed purchases exist yet, calculate from Product totals
    if (totalSalesCount === 0) {
      const products = await Product.find({ published: true }).select('totalRevenue totalSales').lean();
      totalRevenueCents = products.reduce((acc, product) => acc + (product.totalRevenue || 0), 0);
      totalSalesCount = products.reduce((acc, p) => acc + (p.totalSales || 0), 0);
    }

    return NextResponse.json({
      windowDays: WINDOW_DAYS,
      revenue: {
        valueCents: totalRevenueCents,
        formatted: formatCurrency(totalRevenueCents),
        recent: currentPurchases.total,
        change: percentageChange(currentPurchases.total, previousPurchases.total),
      },
      sales: {
        value: totalSalesCount,
        recent: currentPurchases.count,
        change: percentageChange(currentPurchases.count, previousPurchases.count),
      },
      subscribers: {
        value: confirmedSubscribers,
        total: totalSubscribers,
        recent: currentSubscribers,
        change: percentageChange(currentSubscribers, previousSubscribers),
      },
      views: {
        value: totalViews,
        articles: totalArticles,
        recent: currentViews,
        change: percentageChange(currentViews, previousViews),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard overview stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
