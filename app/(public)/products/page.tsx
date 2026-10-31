import type { Metadata } from 'next';
import {connectDB} from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import { Section, Container } from '@/components/ui/Section';
import ProductsFilterGrid from '@/components/public/ProductsFilterGrid';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Shop ready-to-use AI guides, e-books, audiobooks, starter kits and apps. Download right after you pay and use them at your own pace.',
  alternates: { canonical: '/products' },
};

async function getProducts() {
  try {
    await connectDB();
    // Only what the cards show: full descriptions would ship to the browser for nothing.
    const products = await Product.find({ published: true })
      .sort({ featured: -1, createdAt: -1 })
      .select('title slug shortDescription price currency category tags thumbnailImage productType licenseType featured')
      .lean();
    return JSON.parse(JSON.stringify(products));
  } catch (error) {
    console.error('Failed to load public products', error);
    return [];
  }
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen">
      <Section className="pb-24 pt-12 md:pt-16">
        <Container>
          <div className="mb-10 max-w-3xl md:mb-14">
            <p className="text-eyebrow text-primary">Shop</p>
            <h1 className="mt-3 text-title text-foreground">
              Guides, books and kits, ready to use.
            </h1>
            <p className="mt-5 text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
              E-books, audiobooks, starter kits and AI apps I&apos;ve made. Buy once, download straight away, and read, listen or use them at your own pace.
            </p>
          </div>

          {products.length > 0 ? (
            <ProductsFilterGrid products={products} />
          ) : (
            <div className="py-16 text-center">
              <h3 className="text-xl font-medium text-foreground">New items coming soon</h3>
              <p className="mt-2 text-muted-foreground">
                I am getting the first guides ready. Please check back soon.
              </p>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}
