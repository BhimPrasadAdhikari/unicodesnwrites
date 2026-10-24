"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MAX_ATTEMPTS = 12;

export default function OrderProcessing() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let currentAttempt = 0;
    const interval = setInterval(() => {
      currentAttempt += 1;
      setAttempts(currentAttempt);
      router.refresh();
      if (currentAttempt >= MAX_ATTEMPTS) clearInterval(interval);
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center sm:p-10">
        {attempts < MAX_ATTEMPTS ? <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-2 border-current border-t-transparent text-foreground" /> : null}
        <p className="text-eyebrow text-primary">Payment confirmation</p>
        <h1 className="mt-3 font-serif text-[28px] font-medium leading-tight text-foreground">
          {attempts < MAX_ATTEMPTS ? 'Preparing your order…' : 'Confirmation is taking longer than usual'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {attempts < MAX_ATTEMPTS
            ? 'We are waiting for the payment provider and will update this page automatically.'
            : 'Your payment may still be processing. Refresh once more or check your email for the delivery link.'}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={() => router.refresh()} className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition hover:bg-foreground/90">Check again</button>
          <Link href="/products" className="inline-flex h-11 items-center justify-center rounded-lg border border-foreground px-5 text-[15px] font-medium transition hover:bg-secondary">Return to tools</Link>
        </div>
      </div>
    </div>
  );
}
