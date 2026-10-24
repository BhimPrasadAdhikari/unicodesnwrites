import PurchasesList from '@/components/cms/PurchasesList';
import dbConnect from '@/lib/db/connection';
import Purchase from '@/lib/models/Purchase';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const dynamic = 'force-dynamic';

async function getPurchases() {
  await dbConnect();
  const purchases = await Purchase.find({})
    .populate('product', 'title')
    .sort({ purchasedAt: -1 });
  
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
      />

      <PurchasesList purchases={purchases} />
    </div>
  );
}
