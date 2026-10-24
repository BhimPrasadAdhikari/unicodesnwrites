import Link from 'next/link';
import ProductList from '@/components/cms/ProductList';
import dbConnect from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import { Plus } from 'lucide-react';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const dynamic = 'force-dynamic';

async function getProducts() {
  await dbConnect();
  const products = await Product.find({}).sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(products));
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Digital Store"
        title="Products & Tools"
        description="Manage digital products, code templates, audiobooks, playbooks, pricing, and downloads."
        action={
          <Link href="/dashboard/products/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4" /> New product
          </Link>
        }
      />

      <ProductList products={products} />
    </div>
  );
}
