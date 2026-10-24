import { NextResponse } from 'next/server';

import { AdminAccessError, requireAdminSession } from '@/lib/auth/admin';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Purchase from '@/lib/models/Purchase';
import { toCSV } from '@/lib/utils/csv';

type Row = {
  purchaseId?: string;
  customerName?: string;
  customerEmail: string;
  product: { title?: string } | null;
  amount?: number;
  currency?: string;
  status: string;
  purchasedAt?: Date;
  refundedAt?: Date;
  downloadCount?: number;
};

/** Every order as CSV, for bookkeeping and tax. */
export async function GET() {
  try {
    await requireAdminSession();
    await connectDB();
    const purchases = await Purchase.find({})
      .sort({ purchasedAt: -1 })
      .select('purchaseId customerName customerEmail product amount currency status purchasedAt refundedAt downloadCount')
      .populate({ path: 'product', model: Product, select: 'title' })
      .lean<Row[]>();

    const csv = toCSV(
      purchases.map((purchase) => ({
        order: purchase.purchaseId || '',
        date: purchase.purchasedAt ? new Date(purchase.purchasedAt).toISOString() : '',
        product: purchase.product?.title || 'Deleted product',
        name: purchase.customerName || '',
        email: purchase.customerEmail,
        amount: ((purchase.amount || 0) / 100).toFixed(2),
        currency: (purchase.currency || 'usd').toUpperCase(),
        status: purchase.status,
        refunded: purchase.refundedAt ? new Date(purchase.refundedAt).toISOString() : '',
        downloads: purchase.downloadCount ?? 0,
      })),
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="purchases-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Purchase export failed', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
