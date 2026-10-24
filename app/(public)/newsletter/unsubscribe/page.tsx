import type { Metadata } from 'next';
import { Suspense } from 'react';
import NewsletterUnsubscribe from '@/components/public/NewsletterUnsubscribe';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function UnsubscribePage() {
    return (
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
            <NewsletterUnsubscribe />
        </Suspense>
    );
}
