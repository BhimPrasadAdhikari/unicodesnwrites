import type { Metadata } from 'next';
import {connectDB} from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import { Section, Container } from '@/components/ui/Section';
import ProductsFilterGrid from '@/components/public/ProductsFilterGrid';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tools, kits and books',
  description: 'Starter kits, AI applications, digital books and tools from the notebook, ready to own and run.',
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
            <p className="text-eyebrow text-primary">§ Tools</p>
            <h1 className="mt-3 text-title text-foreground">
              Kits, books and tools from the notebook, ready to own.
            </h1>
            <p className="mt-5 text-[17px] leading-[1.6] text-muted-foreground sm:text-lg">
              Finished tools, starter kits, audiobooks, digital books and full-stack AI applications I&apos;ve built and packaged. Buy the asset, read or listen, inspect the code and run it in your own environment.
            </p>
          </div>

          {products.length > 0 ? (
            <ProductsFilterGrid products={products} />
          ) : (
            <div className="py-16 text-center">
              <h3 className="text-xl font-medium text-foreground">Products coming soon</h3>
              <p className="mt-2 text-muted-foreground">
                We are curating a focused catalog. Check back shortly for new releases.
              </p>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}
