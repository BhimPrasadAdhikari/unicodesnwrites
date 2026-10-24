import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import Purchase from '@/lib/models/Purchase';
import Subscriber from '@/lib/models/Subscriber';
import { Post } from '@/lib/models/Post';
import Product from '@/lib/models/Product';
import { Analytics } from '@/lib/models/Analytics';

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    await connectDB();

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [completedPurchases, currentMonthPurchases, previousMonthPurchases] = await Promise.all([
      Purchase.find({ status: 'completed' }).select('amount').lean(),
      Purchase.find({ status: 'completed', purchasedAt: { $gte: currentMonthStart } })
        .select('amount')
        .lean(),
      Purchase.find({
        status: 'completed',
        purchasedAt: { $gte: previousMonthStart, $lt: currentMonthStart },
      })
        .select('amount')
        .lean(),
    ]);

    let totalRevenueCents = completedPurchases.reduce((acc, purchase) => acc + (purchase.amount || 0), 0);
    let totalSalesCount = completedPurchases.length;

    // Fallback: If no completed purchases exist yet, calculate from Product totals
    if (totalSalesCount === 0) {
      const products = await Product.find({ published: true }).lean();
      totalRevenueCents = products.reduce((acc, product) => acc + (product.totalRevenue || 0), 0);
      totalSalesCount = products.reduce((acc, p) => acc + (p.totalSales || 0), 0);
    }

    const [
      totalSubscribers,
      confirmedSubscribers,
      currentMonthSubscribers,
      previousMonthSubscribers,
      posts,
      totalViews,
      currentMonthViews,
      previousMonthViews,
    ] = await Promise.all([
      Subscriber.countDocuments(),
      Subscriber.countDocuments({ status: 'confirmed' }),
      Subscriber.countDocuments({ status: 'confirmed', confirmedAt: { $gte: currentMonthStart } }),
      Subscriber.countDocuments({
        status: 'confirmed',
        confirmedAt: { $gte: previousMonthStart, $lt: currentMonthStart },
      }),
      Post.find({ published: true }).select('_id').lean(),
      Analytics.countDocuments({ event: 'page_view' }),
      Analytics.countDocuments({ event: 'page_view', timestamp: { $gte: currentMonthStart } }),
      Analytics.countDocuments({
        event: 'page_view',
        timestamp: { $gte: previousMonthStart, $lt: currentMonthStart },
      }),
    ]);

    const totalArticles = posts.length;
    const currentMonthRevenue = currentMonthPurchases.reduce(
      (acc, purchase) => acc + (purchase.amount || 0),
      0
    );
    const previousMonthRevenue = previousMonthPurchases.reduce(
      (acc, purchase) => acc + (purchase.amount || 0),
      0
    );

    return NextResponse.json({
      revenue: {
        valueCents: totalRevenueCents,
        formatted: `$${(totalRevenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: percentageChange(currentMonthRevenue, previousMonthRevenue),
      },
      sales: {
        value: totalSalesCount,
        change: percentageChange(currentMonthPurchases.length, previousMonthPurchases.length),
      },
      subscribers: {
        value: confirmedSubscribers,
        total: totalSubscribers,
        change: percentageChange(currentMonthSubscribers, previousMonthSubscribers),
      },
      views: {
        value: totalViews,
        articles: totalArticles,
        change: percentageChange(currentMonthViews, previousMonthViews),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard overview stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
