import PurchasesList from '@/components/cms/PurchasesList';
import { escapeRegex, Pager, parsePage, redirectPastLastPage, SearchBox } from '@/components/cms/AdminListControls';
import dbConnect from '@/lib/db/connection';
import Purchase from '@/lib/models/Purchase';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function PurchasesPage(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const search = (params.q || '').trim().slice(0, 120);

  const query: Record<string, unknown> = {};
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    query.$or = [{ customerEmail: pattern }, { purchaseId: pattern }, { customerName: pattern }];
  }

  await dbConnect();
  const [rows, total, statusTotals] = await Promise.all([
    // Only what the table shows: download tokens never reach the browser.
    Purchase.find(query)
      .select('purchaseId customerEmail customerName amount currency status product purchasedAt')
      .populate('product', 'title')
      .sort({ purchasedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Purchase.countDocuments(query),
    // Summary cards cover every order, not just this page, with revenue kept per currency.
    Purchase.aggregate<{ _id: { status: string; currency: string }; count: number; amount: number }>([
      { $match: { status: { $in: ['completed', 'refunded'] } } },
      { $group: { _id: { status: '$status', currency: { $ifNull: ['$currency', 'INR'] } }, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
  ]);
  const linkParams = { q: params.q };
  const totalPages = Math.ceil(total / PAGE_SIZE);
  redirectPastLastPage('/dashboard/purchases', linkParams, page, totalPages);

  const completed = statusTotals.filter((row) => row._id.status === 'completed');
  const summary = {
    completedCount: completed.reduce((sum, row) => sum + row.count, 0),
    refundedCount: statusTotals.filter((row) => row._id.status === 'refunded').reduce((sum, row) => sum + row.count, 0),
    revenue: completed
      .map((row) => ({ currency: row._id.currency, amount: row.amount }))
      .sort((a, b) => b.amount - a.amount),
  };
  const purchases = JSON.parse(JSON.stringify(rows));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Order Fulfillment"
        title="Customer Purchases"
        description="Review customer purchase orders, fulfillment status, and file download access."
        action={
          <a href="/api/admin/purchases/export" className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
            Export CSV
          </a>
        }
      />

      <PurchasesList
        purchases={purchases}
        summary={summary}
        total={total}
        search={search}
        searchBox={<SearchBox base="/dashboard/purchases" params={linkParams} placeholder="Search email, order ID or name" />}
      />
      <Pager base="/dashboard/purchases" params={linkParams} page={page} totalPages={totalPages} />
    </div>
  );
}
