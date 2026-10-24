'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const field = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm';

export function CouponForm() {
  const router = useRouter();
  const [kind, setKind] = useState<'percent' | 'amount'>('percent');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = Number(form.get('value'));
    const max = Number(form.get('maxRedemptions'));
    const code = String(form.get('code') || '').toUpperCase();
    const body = {
      code,
      ...(kind === 'percent' ? { percentOff: value } : { amountOff: value }),
      ...(max ? { maxRedemptions: max } : {}),
      ...(form.get('expiresAt') ? { expiresAt: `${form.get('expiresAt')}T23:59:59` } : {}),
    };
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not create the coupon');
      setMessage({ ok: true, text: `${code} is live at checkout.` });
      formElement.reset();
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Could not create the coupon' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <label className="space-y-1.5 text-sm font-medium">
        Code
        <input name="code" required pattern="[A-Za-z0-9]{3,30}" placeholder="LAUNCH20" className={`${field} font-mono uppercase`} />
      </label>
      <fieldset className="space-y-1.5 text-sm font-medium">
        <legend>Discount</legend>
        <div className="flex gap-2">
          <select aria-label="Discount type" value={kind} onChange={(event) => setKind(event.target.value as 'percent' | 'amount')} className={`${field} w-24`}>
            <option value="percent">%</option>
            <option value="amount">USD</option>
          </select>
          <input
            name="value"
            type="number"
            required
            min={kind === 'percent' ? 1 : 0.5}
            max={kind === 'percent' ? 100 : 10000}
            step={kind === 'percent' ? 1 : 0.01}
            aria-label="Discount value"
            placeholder={kind === 'percent' ? '20' : '5.00'}
            className={field}
          />
        </div>
      </fieldset>
      <label className="space-y-1.5 text-sm font-medium">
        Max uses <span className="font-normal text-muted-foreground">(optional)</span>
        <input name="maxRedemptions" type="number" min={1} placeholder="Unlimited" className={field} />
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        Expires <span className="font-normal text-muted-foreground">(optional)</span>
        <input name="expiresAt" type="date" className={field} />
      </label>
      <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create coupon
      </button>
      {message ? <p role="status" className={`text-sm sm:col-span-2 lg:col-span-5 ${message.ok ? 'text-success' : 'text-destructive'}`}>{message.text}</p> : null}
    </form>
  );
}
