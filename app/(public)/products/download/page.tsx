import type { Metadata } from 'next';
import Link from 'next/link';

import RequestDownloadLinks from '@/components/public/RequestDownloadLinks';
import { Container } from '@/components/ui/Section';

export const metadata: Metadata = { title: 'Your download', robots: { index: false, follow: false } };

const messages: Record<string, { title: string; body: string }> = {
  expired: { title: 'This download link has expired.', body: 'Links last 24 hours. Get a fresh one below; your purchase is still yours.' },
  limit: { title: 'This link has been used up.', body: 'Each link allows a few downloads. Get a fresh one below.' },
  unavailable: { title: 'This purchase can’t be downloaded.', body: 'It may have been refunded, or it belongs to a different account. If that seems wrong, get in touch.' },
  invalid: { title: 'That download link isn’t valid.', body: 'It may have been replaced by a newer link. Get a fresh one below.' },
};

export default async function DownloadStatusPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const message = messages[status || ''] ?? messages.invalid;

  return (
    <Container className="max-w-xl py-16 sm:py-24">
      <p className="text-eyebrow text-primary">Downloads</p>
      <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.02em]">{message.title}</h1>
      <p className="mt-4 text-[17px] leading-[1.6] text-muted-foreground">{message.body}</p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Signed in?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your <Link href="/account" className="underline decoration-primary decoration-2 underline-offset-4">account page</Link> always has a working download button for everything you bought with that email.
        </p>
        <div className="my-6 border-t border-border" />
        <h2 className="font-semibold">Or get new links by email</h2>
        <p className="mt-1 text-sm text-muted-foreground">We’ll send a fresh link for each purchase made with that address.</p>
        <RequestDownloadLinks />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Still stuck? <Link href="/contact" className="underline decoration-primary decoration-2 underline-offset-4">Contact me</Link> with your order number.
      </p>
    </Container>
  );
}
