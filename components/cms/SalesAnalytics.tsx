'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, IndianRupee, ReceiptText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

interface MonthlyRevenue {
  name: string;
  revenue: number;
}

interface SalesAnalyticsProps {
  metrics: {
    totalRevenue: number;
    totalSales: number;
    averageOrderValue: number;
    monthlyRevenue: MonthlyRevenue[];
  };
}

export default function SalesAnalytics({ metrics }: SalesAnalyticsProps) {
  const strongestMonth = metrics.monthlyRevenue.reduce<MonthlyRevenue | null>(
    (best, month) => (!best || month.revenue > best.revenue ? month : best),
    null,
  );
  const latestMonth = metrics.monthlyRevenue.at(-1);

  const cards = [
    {
      label: 'Completed revenue',
      value: formatCurrency(metrics.totalRevenue),
      detail: 'Across all completed orders',
      icon: IndianRupee,
    },
    {
      label: 'Completed sales',
      value: metrics.totalSales.toLocaleString(),
      detail: 'Orders successfully processed',
      icon: ReceiptText,
    },
    {
      label: 'Average order',
      value: formatCurrency(metrics.averageOrderValue),
      detail: 'Revenue per completed sale',
      icon: ArrowUpRight,
    },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="Sales summary" className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-border bg-card/70 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card/70">
        <header className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-eyebrow text-primary">Six-month trend</p>
            <h2 className="mt-2 text-lg font-semibold">Revenue history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Completed order value, grouped by purchase month.</p>
          </div>
          {strongestMonth && strongestMonth.revenue > 0 && (
            <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              Best month <span className="ml-1 font-semibold text-foreground">{strongestMonth.name} · {formatCurrency(strongestMonth.revenue)}</span>
            </div>
          )}
        </header>

        {metrics.monthlyRevenue.some((month) => month.revenue > 0) ? (
          <div className="h-[320px] w-full p-3 pr-5 sm:h-[390px] sm:p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyRevenue} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-border" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="currentColor" className="text-muted-foreground" width={72} tickFormatter={(value: number) => formatCurrency(value)} />
                <Tooltip
                  cursor={{ fill: 'rgba(124, 58, 237, 0.08)' }}
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[8, 8, 2, 2]} maxBarSize={72} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <IndianRupee className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <h3 className="mt-4 font-semibold">No completed revenue yet</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Completed purchases will appear here automatically. The latest reporting month is {latestMonth?.name || 'not available'}.</p>
          </div>
        )}
      </section>
    </div>
  );
}
