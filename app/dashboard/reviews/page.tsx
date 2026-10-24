import type { Metadata } from 'next';
import Link from 'next/link';
import { Star } from 'lucide-react';

import { AdminRowActions } from '@/components/cms/AdminRowActions';
import { FilterTabs, Pager, parsePage } from '@/components/cms/AdminListControls';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Badge } from '@/components/ui/Badge';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Review from '@/lib/models/Review';

export const metadata: Metadata = { title: 'Reviews | CMS' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

type ReviewRow = {
  _id: { toString(): string };
  customerName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  verified: boolean;
  approved: boolean;
  createdAt: Date;
  product: { title?: string; slug?: string } | null;
};

export default async function ReviewsPage(props: { searchParams: Promise<{ state?: string; page?: string }> }) {
  const params = await props.searchParams;
  const page = parsePage(params.page);
  const state = params.state === 'approved' ? 'approved' : params.state === 'all' ? 'all' : 'pending';
  const query = state === 'all' ? {} : { approved: state === 'approved' };

  await connectDB();
  const [reviews, total, pending, approved] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({ path: 'product', model: Product, select: 'title slug' })
      .lean<ReviewRow[]>(),
    Review.countDocuments(query),
    Review.countDocuments({ approved: false }),
    Review.countDocuments({ approved: true }),
  ]);
  const linkParams = { state: params.state };

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Sell"
        title="Reviews"
        description="Reviews appear on product pages only after you approve them. Verified means a signed-in buyer wrote it."
      />

      <div className="mb-5">
        <FilterTabs
          base="/dashboard/reviews"
          params={linkParams}
          name="state"
          options={[
            { value: '', label: 'Waiting', count: pending },
            { value: 'approved', label: 'Approved', count: approved },
            { value: 'all', label: 'All', count: pending + approved },
          ]}
        />
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Star className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{state === 'pending' ? 'Nothing waiting for approval.' : 'No reviews here yet.'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const id = review._id.toString();
            return (
              <li key={id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-foreground" aria-label={`${review.rating} out of 5`}>
                    {'★'.repeat(review.rating)}<span className="text-muted-foreground/40">{'★'.repeat(5 - review.rating)}</span>
                  </span>
                  {review.verified ? <Badge variant="success">Verified buyer</Badge> : <Badge variant="neutral">Unverified</Badge>}
                  {review.approved ? <Badge variant="info">Live</Badge> : <Badge variant="warning">Waiting</Badge>}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{review.comment}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {review.customerName} · {review.customerEmail} · {new Date(review.createdAt).toLocaleDateString()} ·{' '}
                  {review.product?.slug ? (
                    <Link href={`/products/${review.product.slug}`} className="underline underline-offset-2">{review.product.title}</Link>
                  ) : (
                    'Deleted product'
                  )}
                </p>
                <AdminRowActions
                  className="mt-4"
                  actions={[
                    review.approved
                      ? { label: 'Hide', url: `/api/admin/reviews/${id}`, method: 'PATCH', body: { approved: false } }
                      : { label: 'Approve', url: `/api/admin/reviews/${id}`, method: 'PATCH', body: { approved: true }, tone: 'primary' },
                    { label: 'Delete', url: `/api/admin/reviews/${id}`, method: 'DELETE', confirm: 'Confirm delete', tone: 'danger' },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}

      <Pager base="/dashboard/reviews" params={linkParams} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </div>
  );
}
