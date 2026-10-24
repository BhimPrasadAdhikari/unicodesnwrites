import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import NewsletterConfirmation from '@/components/public/NewsletterConfirmation';

export const dynamic = 'force-dynamic';

export default function ConfirmationPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-3xl border border-border bg-card p-8 text-center sm:p-10">
        <Suspense fallback={
          <div className="max-w-md mx-auto py-12 px-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Preparing confirmation…</p>
          </div>
        }>
          <NewsletterConfirmation />
        </Suspense>
      </div>
    </main>
  );
}
