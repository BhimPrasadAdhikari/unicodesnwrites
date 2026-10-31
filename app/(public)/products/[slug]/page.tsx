import Link from 'next/link';
import { cache } from 'react';
import type { Metadata } from 'next';
import { Types } from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/config/auth';
import Review from '@/lib/models/Review';
import { siteConfig } from '@/lib/config/site.config';
import { businessConfig } from '@/lib/config/business';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { notFound } from 'next/navigation';
import {connectDB} from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import CheckoutButton from '@/components/public/CheckoutButton';
import ProductMedia from '@/components/public/ProductMedia';
import ReviewForm from '@/components/public/ReviewForm';
import ReviewsList from '@/components/public/ReviewsList';
import { formatCurrency } from '@/lib/utils/currency';
import { Check } from 'lucide-react';
import BlogContent from '@/components/public/BlogContent';
import { preserveSpacing } from '@/lib/utils/markdown';
import { Section, Container } from '@/components/ui/Section';

export const dynamic = 'force-dynamic';

// Shared by generateMetadata and the page within one request.
const getProduct = cache(async (slug: string) => {
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  await connectDB();
  const product = await Product.findOne({ slug, published: true });
  if (!product) return null;
  return JSON.parse(JSON.stringify(product));
});

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product not found', robots: { index: false } };
  return {
    title: product.title,
    description: product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.shortDescription,
      images: product.thumbnailImage ? [product.thumbnailImage] : undefined,
    },
  };
}

async function getRatingSummary(productId: string) {
  const [row] = await Review.aggregate<{ count: number; average: number }>([
    { $match: { product: new Types.ObjectId(productId), approved: true } },
    { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } },
  ]);
  return row && row.count > 0 ? row : null;
}

export default async function ProductPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const params = await props.params;
  const { checkout } = await props.searchParams;
  // Prefill Razorpay checkout with the signed-in email so the purchase shows up under /account.
  const session = await getServerSession(authOptions);
  const buyerEmail = session?.user?.sessionValid ? session.user.email ?? undefined : undefined;
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  const rating = await getRatingSummary(String(product._id)).catch(() => null);
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription,
    image: product.thumbnailImage || undefined,
    sku: String(product._id),
    category: product.category,
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers: {
      '@type': 'Offer',
      price: (product.price / 100).toFixed(2),
      priceCurrency: (product.currency || 'USD').toUpperCase(),
      availability: 'https://schema.org/InStock',
      url: `https://${siteConfig.domain}/products/${product.slug}`,
    },
    ...(rating
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating.average.toFixed(1), reviewCount: rating.count } }
      : {}),
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
      />
      <AnalyticsTracker 
        event="product_view" 
        metadata={{ 
          productId: product._id, 
          title: product.title,
          price: product.price
        }} 
      />
      
      <Section className="pb-12 pt-10 md:pt-14">
        <Container>
          {/* Back Link */}
          <nav aria-label="Breadcrumb" className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">
            <Link href="/products" className="inline-flex min-h-11 items-center hover:text-foreground">SHOP</Link>
            <span aria-hidden="true"> / </span>
            <span>{product.productType.toUpperCase()}</span>
          </nav>
          
          <div className="mt-6 grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <ProductMedia
              title={product.title}
              productType={product.productType}
              thumbnailImage={product.thumbnailImage}
              galleryImages={product.galleryImages}
              previewFiles={product.previewFiles}
            />

            <div>
              <p className="text-eyebrow text-primary">{product.productType} · {product.category}</p>

              <h1 className="mt-3 text-title text-foreground">
                {product.title}
              </h1>

              <p className="mt-4 font-serif text-[19px] leading-[1.55] text-muted-foreground sm:text-[21px]">
                {product.shortDescription}
              </p>

              <div className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline gap-3 mb-6">
                  <span className="font-mono text-[32px] leading-none text-foreground">
                    {formatCurrency(product.price, product.currency)}
                  </span>
                  <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{product.licenseType} license</span>
                </div>

                <p className="mb-5 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">SAFE PAYMENT · DOWNLOAD RIGHT AWAY · LINK SENT BY EMAIL</p>

                <div>
                  {checkout === 'cancelled' ? (
                    <p role="status" className="mb-3 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
                      Payment cancelled. You weren&apos;t charged. You can try again any time.
                    </p>
                  ) : null}
                  <CheckoutButton productId={product._id} available={product.currency === 'INR' && product.price >= 100} email={buyerEmail} />
                </div>

                <p className="mt-4 text-[13px] text-muted-foreground">
                  Prices in Indian rupees (₹), inclusive of applicable taxes. Pay securely with UPI, cards, netbanking or wallets through Razorpay; the download link arrives by email once payment is confirmed. All sales are final; see the <Link href="/refund-policy" className="underline underline-offset-2 hover:text-foreground">refund policy</Link>. Sold by {businessConfig.legalName}.
                </p>
              </div>

              {product.whatsIncluded && product.whatsIncluded.length > 0 && (
                <div className="mt-10">
                  <h2 className="mb-4 text-eyebrow text-muted-foreground">What&apos;s included</h2>
                  <ul className="space-y-4">
                    {product.whatsIncluded.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 border-b border-border pb-4 text-[15px] text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="pb-24">
        <Container>
          <div className="max-w-3xl mx-auto">
             <BlogContent content={product.longDescription} />
          </div>

          <div className="mx-auto mt-20 max-w-3xl space-y-12 border-t border-border pt-14">
            <div>
              <p className="text-eyebrow text-primary">Reviews</p>
              <h2 className="mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em] text-foreground">What readers say</h2>
              <p className="mt-2 text-muted-foreground">Bought this? Leave a review to help others decide.</p>
              <div className="mt-8">
                <ReviewForm productId={product._id} />
              </div>
            </div>

            <ReviewsList productId={product._id} />
          </div>
        </Container>
      </Section>
    </div>
  );
}
