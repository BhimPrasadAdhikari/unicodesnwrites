'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle2, Mail, RefreshCw, RotateCcw, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface Purchase {
  _id: string;
  purchaseId: string;
  customerEmail: string;
  customerName?: string;
  amount: number;
  currency: string;
  status: string;
  product: { title: string } | null;
  purchasedAt: string;
}

interface PurchaseSummary {
  completedCount: number;
  refundedCount: number;
  revenue: { currency: string; amount: number }[];
}

interface PurchasesListProps {
  /** One page of orders; search and paging happen on the server. */
  purchases: Purchase[];
  summary: PurchaseSummary;
  total: number;
  search: string;
  searchBox: ReactNode;
}

const statusStyles: Record<string, string> = {
  completed: 'border-success/20 bg-success/10 text-success',
  refunded: 'border-destructive/20 bg-destructive/10 text-destructive',
  pending: 'border-warning/20 bg-warning/10 text-warning',
};

export default function PurchasesList({ purchases, summary, total, search, searchBox }: PurchasesListProps) {
  const [resending, setResending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Totals in different currencies can't be added together, so each is listed.
  const revenue = summary.revenue.length
    ? summary.revenue.map((row) => formatCurrency(row.amount, row.currency)).join(' + ')
    : formatCurrency(0, 'INR');

  const handleResendEmail = async (id: string) => {
    setResending(id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/purchases/${encodeURIComponent(id)}/resend-email`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'The delivery email could not be resent.');
      setFeedback({ type: 'success', message: payload?.message || 'Delivery email queued for resending.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'The request failed. Please try again.' });
    } finally {
      setResending(null);
    }
  };

  return (
    <div className="space-y-5">
      <section aria-label="Purchase summary" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Completed orders', value: summary.completedCount.toLocaleString(), icon: CheckCircle2 },
          { label: 'Recorded revenue', value: revenue, icon: ShoppingBag },
          { label: 'Refunded orders', value: summary.refundedCount.toLocaleString(), icon: RotateCcw },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card/70">
        <div className="border-b border-border p-4 sm:p-5">
          {searchBox}
          <p className="mt-2 text-xs text-muted-foreground">{total.toLocaleString()} {search ? 'matching ' : ''}{total === 1 ? 'order' : 'orders'}</p>
        </div>

        {feedback && (
          <Alert role="status" variant={feedback.type === 'success' ? 'success' : 'destructive'} className="mx-4 mt-4 sm:mx-5">
            {feedback.message}
          </Alert>
        )}

        <div className="grid gap-3 p-4 md:hidden">
          {purchases.map((purchase) => (
            <article key={purchase._id} className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{purchase.product?.title || 'Unavailable product'}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{purchase.customerName || purchase.customerEmail}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-2xs font-semibold capitalize ${statusStyles[purchase.status] || statusStyles.pending}`}>{purchase.status}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-muted-foreground">Order</dt><dd className="mt-1 font-mono">#{purchase.purchaseId.slice(0, 8)}</dd></div>
                <div><dt className="text-muted-foreground">Amount</dt><dd className="mt-1 font-semibold">{formatCurrency(purchase.amount, purchase.currency)}</dd></div>
                <div><dt className="text-muted-foreground">Date</dt><dd className="mt-1">{new Date(purchase.purchasedAt).toLocaleDateString()}</dd></div>
                <div className="flex items-end justify-end">
                  <button type="button" onClick={() => handleResendEmail(purchase._id)} disabled={resending === purchase._id} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-medium transition hover:bg-muted disabled:opacity-50">
                    {resending === purchase._id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    Resend
                  </button>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table className="min-w-[880px]">
            <TableHeader>
              <tr>{['Order', 'Customer', 'Product', 'Date', 'Amount', 'Status', 'Action'].map((heading) => <TableHead key={heading} className={heading === 'Action' ? 'text-right' : undefined}>{heading}</TableHead>)}</tr>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase._id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{purchase.purchaseId.slice(0, 8)}</TableCell>
                  <TableCell><p className="text-sm font-medium">{purchase.customerName || 'Customer'}</p><p className="mt-1 text-xs text-muted-foreground">{purchase.customerEmail}</p></TableCell>
                  <TableCell className="text-sm">{purchase.product?.title || 'Unavailable product'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(purchase.purchasedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm font-semibold">{formatCurrency(purchase.amount, purchase.currency)}</TableCell>
                  <TableCell><span className={`rounded-md border px-2.5 py-1 text-2xs font-semibold capitalize ${statusStyles[purchase.status] || statusStyles.pending}`}>{purchase.status}</span></TableCell>
                  <TableCell className="text-right"><button type="button" onClick={() => handleResendEmail(purchase._id)} disabled={resending === purchase._id} aria-label={`Resend delivery email for order ${purchase.purchaseId}`} className="touch-target rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">{resending === purchase._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}</button></TableCell>
                </TableRow>
              ))}
              {purchases.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center text-sm text-muted-foreground">{search ? 'No orders match that search.' : 'No orders yet.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
