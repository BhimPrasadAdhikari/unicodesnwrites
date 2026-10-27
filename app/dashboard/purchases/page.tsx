import PurchasesList from '@/components/cms/PurchasesList';
import dbConnect from '@/lib/db/connection';
import Purchase from '@/lib/models/Purchase';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const dynamic = 'force-dynamic';

async function getPurchases() {
  await dbConnect();
  // Only what the table shows: download tokens never reach the browser.
  const purchases = await Purchase.find({})
    .select('purchaseId customerEmail customerName amount currency status product purchasedAt')
    .populate('product', 'title')
    .sort({ purchasedAt: -1 })
    .limit(1000)
    .lean();
  
  return JSON.parse(JSON.stringify(purchases));
}

export default async function PurchasesPage() {
  const purchases = await getPurchases();

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

      <PurchasesList purchases={purchases} />
    </div>
  );
}
