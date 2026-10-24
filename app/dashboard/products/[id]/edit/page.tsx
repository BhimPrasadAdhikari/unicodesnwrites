import ProductEditor from '@/components/cms/ProductEditor';
import dbConnect from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import { notFound } from 'next/navigation';
import { isValidObjectId } from 'mongoose';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const dynamic = 'force-dynamic';

async function getProduct(id: string) {
  if (!isValidObjectId(id)) return null;
  await dbConnect();
  try {
    const product = await Product.findById(id);
    if (!product) return null;
    return JSON.parse(JSON.stringify(product));
  } catch (error) {
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(props: PageProps) {
    const params = await props.params;
    return {
        title: `Edit Product`
    }
}

export default async function EditProductPage(props: PageProps) {
  const params = await props.params;
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  return <div className="mx-auto max-w-5xl pb-16"><DashboardPageHeader eyebrow="Product desk" title={`Edit ${product.title}`} description="Update product details, assets, pricing, and publishing status." /><ProductEditor initialData={product} isEditing /></div>;
}
