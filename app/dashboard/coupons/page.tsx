import type { Metadata } from 'next';
import { TicketPercent } from 'lucide-react';

import { AdminRowActions } from '@/components/cms/AdminRowActions';
import { CouponForm } from '@/components/cms/CouponForm';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { listCoupons, type CouponRow } from '@/lib/services/coupons';

export const metadata: Metadata = { title: 'Coupons | CMS' };
export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  let coupons: CouponRow[] = [];
  let failed = false;
  try {
    coupons = await listCoupons();
  } catch (error) {
    console.error('Failed to list coupons', error);
    failed = true;
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Sell"
        title="Coupons"
        description="Discount codes buyers type at Stripe checkout. Deactivate a code to stop it working."
      />
      <CouponForm />
      {failed ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Couldn&apos;t reach Stripe. Check the payments settings on the System health page.
        </p>
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <TicketPercent className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No coupons yet. Create one for a launch, a newsletter or a course cohort.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table className="min-w-[760px]">
            <TableHeader>
              <tr>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                  <TableCell>{coupon.discount}</TableCell>
                  <TableCell className="text-sm">{coupon.timesRedeemed}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell>{coupon.active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Off</Badge>}</TableCell>
                  <TableCell>
                    <AdminRowActions
                      actions={[
                        coupon.active
                          ? { label: 'Deactivate', url: `/api/admin/coupons/${coupon.id}`, method: 'PATCH', body: { active: false }, confirm: 'Confirm deactivate', tone: 'danger' }
                          : { label: 'Reactivate', url: `/api/admin/coupons/${coupon.id}`, method: 'PATCH', body: { active: true } },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
