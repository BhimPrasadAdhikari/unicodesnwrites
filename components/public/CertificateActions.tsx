'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { certificatePath, certificateUrl, linkedInAddToProfileUrl } from '@/lib/utils/certificate';

const primary = 'inline-flex items-center rounded-lg bg-foreground font-medium text-background hover:bg-foreground/90';
const secondary = 'inline-flex items-center rounded-lg border border-border font-medium hover:border-foreground/40';

function useCopyLink(code: string) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl(code));
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
    window.setTimeout(() => setCopied('idle'), 2500);
  };
  const label = copied === 'copied' ? 'Link copied' : copied === 'failed' ? 'Could not copy' : 'Copy link';
  return { copy, label };
}

type CertificateActionsProps = {
  certificate: { code: string; courseTitle: string; completedAt: string; hidden?: boolean };
  /** Smaller buttons for cards */
  compact?: boolean;
  className?: string;
};

/** View, share, copy and print buttons for a learner's own certificate. */
export function CertificateActions({ certificate, compact = false, className }: CertificateActionsProps) {
  const { copy, label } = useCopyLink(certificate.code);
  const size = compact ? 'h-10 px-4 text-sm' : 'h-11 px-5 text-[15px]';

  if (certificate.hidden) {
    return (
      <p className={cn('text-sm leading-6 text-muted-foreground', className)}>
        Your certificate is hidden, so its link doesn&apos;t work for anyone.{' '}
        <Link href="/account?tab=learning" className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4">
          Show it again in your account
        </Link>
      </p>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Link href={certificatePath(certificate.code)} className={cn(primary, size)}>View certificate</Link>
      <a href={linkedInAddToProfileUrl(certificate)} target="_blank" rel="noopener noreferrer" className={cn(secondary, size)}>
        Share on LinkedIn
      </a>
      <button type="button" onClick={copy} className={cn(secondary, size)} aria-live="polite">{label}</button>
      <Link href={`${certificatePath(certificate.code)}?print=1`} className={cn(secondary, size)}>Print / Save as PDF</Link>
    </div>
  );
}

/** Buttons on the public certificate page. ?print=1 opens the print dialog once, for "Print / Save as PDF" links. */
export function CertificatePageActions({ code, autoPrint = false }: { code: string; autoPrint?: boolean }) {
  const { copy, label } = useCopyLink(code);
  const printed = useRef(false);

  useEffect(() => {
    if (!autoPrint || printed.current) return;
    // Let fonts settle so the printout uses the serif headings.
    const timer = window.setTimeout(() => {
      printed.current = true;
      window.print();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className={cn(primary, 'h-10 px-4 text-sm')}>Print / Save as PDF</button>
      <button type="button" onClick={copy} className={cn(secondary, 'h-10 px-4 text-sm')} aria-live="polite">{label}</button>
    </div>
  );
}
