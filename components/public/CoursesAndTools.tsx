import Link from 'next/link';

import { Container } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SiteIcon, SiteIconCell, siteIconFor } from '@/components/ui/SiteIcon';
import { connectDB } from '@/lib/db/connection';
import Product, { IProduct } from '@/lib/models/Product';
import { listPublishedCourses } from '@/lib/services/course-platform';
import { formatCurrency } from '@/lib/utils/currency';

async function getFeaturedProducts(): Promise<IProduct[]> {
  try {
    await connectDB();
    const products = await Product.find({ published: true })
      .sort({ featured: -1, createdAt: -1 })
      .limit(2)
      .lean();
    return JSON.parse(JSON.stringify(products));
  } catch (error) {
    console.error('Failed to fetch featured products', error);
    return [];
  }
}

/** Home "Learn & build": the lead course as an ink panel, two shop items beside it. */
export async function CoursesAndTools() {
  const [courses, products] = await Promise.all([
    listPublishedCourses({ limit: 1 }).catch(() => []),
    getFeaturedProducts(),
  ]);
  const course = courses[0];
  if (!course && products.length === 0) return null;

  return (
    <section id="learn" className="pb-20 pt-4 sm:pb-24">
      <Container className="flex flex-col gap-7">
        <SectionHeading icon="learning" eyebrow="Learn & build" title="Courses and guides" href="/products" linkLabel="Visit the shop" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          {course ? (
            <Link
              href={`/courses/${course.slug}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-3xl bg-foreground text-background sm:flex-row lg:flex-[2]"
            >
              <span className="relative flex min-h-[180px] items-center justify-center bg-[radial-gradient(hsl(var(--background)/0.18)_1px,transparent_1px)] [background-size:12px_12px] sm:min-h-[240px] sm:flex-1">
                <span className="absolute left-4 top-3.5 font-mono text-[12px] tracking-[0.04em] text-background/60">
                  COURSE · {course.level.toUpperCase()}
                </span>
                <SiteIcon kind="courses" size={104} />
                <span className="absolute bottom-4 right-4 h-2 w-2 rounded-full bg-[hsl(var(--ink-dot))]" />
              </span>
              <span className="flex flex-col justify-between gap-5 border-background/15 p-6 sm:flex-1 sm:border-l sm:p-7">
                <span className="flex flex-col gap-2.5">
                  <span className="font-serif text-[26px] font-medium leading-[1.12] sm:text-[30px]">{course.title}</span>
                  <span className="line-clamp-3 text-[15px] leading-[1.6] text-background/70">{course.summary}</span>
                  <span className="font-mono text-[12px] tracking-[0.04em] text-background/60">
                    {course.lessonCount} LESSONS · ABOUT {Math.max(1, Math.round(course.durationMinutes / 60))} H
                  </span>
                </span>
                <span className="inline-flex h-11 w-fit items-center rounded-lg bg-primary px-[18px] text-[15px] font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
                  Start the course
                </span>
              </span>
            </Link>
          ) : null}
          {products.length > 0 ? (
            <div className={course ? "flex min-w-0 flex-col gap-5 lg:flex-1" : "grid min-w-0 flex-1 gap-5 md:grid-cols-2"}>
              {products.map((product) => (
                <Link
                  key={String(product._id)}
                  href={`/products/${product.slug}`}
                  className="group flex flex-1 items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/40 sm:gap-[18px] sm:p-[18px]"
                >
                  <SiteIconCell kind={siteIconFor(`${product.productType} ${product.category}`)} label={false} iconSize={40} className="h-[76px] w-[76px] shrink-0 rounded-xl border border-border sm:h-[88px] sm:w-[88px]" />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground">{product.productType.toUpperCase()}</span>
                    <span className="line-clamp-2 font-serif text-[19px] font-medium leading-[1.2] group-hover:text-primary sm:text-xl">{product.title}</span>
                    <span className="font-mono text-sm">{product.price === 0 ? 'Free' : formatCurrency(product.price, product.currency)}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
