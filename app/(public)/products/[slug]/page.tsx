import Link from 'next/link';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {connectDB} from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import CheckoutButton from '@/components/public/CheckoutButton';
import ReviewForm from '@/components/public/ReviewForm';
import ReviewsList from '@/components/public/ReviewsList';
import { formatCurrency } from '@/lib/utils/currency';
import { Check } from 'lucide-react';
import { GlyphCell, glyphFor } from '@/components/ui/Glyph';
import BlogContent from '@/components/public/BlogContent';
import { preserveSpacing } from '@/lib/utils/markdown';
import { Section, Container } from '@/components/ui/Section';

export const dynamic = 'force-dynamic';

async function getProduct(slug: string) {
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  await connectDB();
  const product = await Product.findOne({ slug, published: true });
  if (!product) return null;
  return JSON.parse(JSON.stringify(product));
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen">
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
            <Link href="/products" className="inline-flex min-h-11 items-center hover:text-foreground">TOOLS</Link>
            <span aria-hidden="true"> / </span>
            <span>{product.productType.toUpperCase()}</span>
          </nav>
          
          <div className="mt-6 grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div className="space-y-6">
              <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-border">
                {product.thumbnailImage ? (
                  <Image
                    src={product.thumbnailImage}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <GlyphCell kind={glyphFor(product.productType)} label={product.productType.toUpperCase()} glyphSize={120} className="absolute inset-0" />
                )}
              </div>

              {product.galleryImages && product.galleryImages.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {product.galleryImages.map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative aspect-square overflow-hidden rounded-xl border border-border"
                    >
                      <Image src={img} alt={`${product.title} preview ${idx + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

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

                <p className="mb-5 font-mono text-[12px] tracking-[0.06em] text-muted-foreground">SECURE PAYMENT · PROTECTED DOWNLOAD · EMAIL DELIVERY</p>

                <div>
                  <CheckoutButton productId={product._id} priceId={product.stripePriceId} />
                </div>

                <p className="mt-4 text-[13px] text-muted-foreground">
                  Secure checkout through Stripe. Download access arrives after payment confirmation.
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
              <p className="mt-2 text-muted-foreground">Share feedback to help others choose with confidence.</p>
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
