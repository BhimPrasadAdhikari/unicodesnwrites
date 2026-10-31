import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { CertificatePageActions } from '@/components/public/CertificateActions';
import { Lockup } from '@/components/ui/Logo';
import { SiteIcon } from '@/components/ui/SiteIcon';
import { getPublicCertificate } from '@/lib/services/certificates';
import { certificateUrl, formatCertificateDate, isCertificateCode } from '@/lib/utils/certificate';

// Lives outside the (public) group on purpose: that group's loading.tsx would start streaming
// before the lookup finishes, and an unknown code then couldn't answer with a real 404.
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ code: string }>; searchParams: Promise<{ print?: string }> };

const loadCertificate = cache(async (code: string) => (isCertificateCode(code) ? getPublicCertificate(code) : null));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const certificate = await loadCertificate(code);
  if (!certificate) return { title: "Certificate can't be found", robots: { index: false, follow: false } };

  const title = `${certificate.name} finished ${certificate.courseTitle}`;
  const description = `${certificate.name} finished the course “${certificate.courseTitle}” on ${formatCertificateDate(certificate.completedAt)}. Verified by unicodesnwrites.`;
  const image = `/og/certificate/${certificate.code}`;
  return {
    title,
    description,
    alternates: { canonical: `/certificates/${certificate.code}` },
    openGraph: { title, description, url: certificateUrl(certificate.code), type: 'website', images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

// Print on one A4 landscape page, always on white paper colours (even in dark mode).
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  html, body { background: #fff !important; }
  .certificate-page {
    --background: 0 0% 100%; --foreground: 225 8% 7%; --card: 45 100% 99%; --card-foreground: 225 8% 7%;
    --muted-foreground: 232 5% 31%; --border: 42 21% 83%; --primary: 8 77% 44%;
    min-height: 0 !important; background: #fff !important; color: hsl(225 8% 7%);
  }
  .certificate-sheet {
    width: 100%; height: calc(210mm - 20mm); aspect-ratio: auto !important; margin: 0;
    break-inside: avoid; page-break-inside: avoid;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}
`;

/** A public, printable certificate anyone can open from a shared link. No sign-in needed. */
export default async function CertificatePage({ params, searchParams }: PageProps) {
  const [{ code }, { print }] = await Promise.all([params, searchParams]);
  const certificate = await loadCertificate(code);
  if (!certificate) notFound();

  const completedOn = formatCertificateDate(certificate.completedAt);
  const verifyUrl = certificateUrl(certificate.code);

  return (
    <main className="certificate-page flex min-h-screen flex-col bg-background text-foreground">
      <style>{PRINT_CSS}</style>
      <header className="border-b border-border print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 md:px-8">
          <Link href="/" aria-label="unicodesnwrites home"><Lockup size={30} /></Link>
          <CertificatePageActions code={certificate.code} autoPrint={print === '1'} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12 print:max-w-none print:p-0">
        <article
          aria-label={`Certificate: ${certificate.name} finished ${certificate.courseTitle}`}
          className="certificate-sheet relative flex flex-col rounded-2xl border-2 border-foreground bg-card p-6 text-center sm:p-10 md:aspect-[297/210] md:p-12"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-xl border border-border sm:inset-3" />

          <div className="relative flex flex-wrap items-center justify-between gap-3 text-left">
            <Lockup size={28} />
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-primary">Certificate of completion</p>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center py-8 md:py-4">
            <SiteIcon kind="learning" size={88} title="A finished learning path" />
            <p className="mt-5 text-[15px] text-muted-foreground sm:text-[17px]">This certificate shows that</p>
            <h1 className="mt-2 font-serif text-[clamp(2.25rem,6vw,3.75rem)] font-medium leading-[1.05] tracking-[-0.02em]">
              {certificate.name}
            </h1>
            <p className="mt-4 text-[15px] text-muted-foreground sm:text-[17px]">finished the course</p>
            <h2 className="mt-2 max-w-3xl font-serif text-[clamp(1.5rem,3.6vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.01em]">
              <span className="hl">{certificate.courseTitle}</span>
            </h2>
            <p className="mt-5 text-[15px] text-muted-foreground sm:text-[17px]">
              on <span className="font-medium text-foreground">{completedOn}</span>
              {certificate.averageQuizScore !== null ? <> · average quiz score <span className="font-medium text-foreground">{certificate.averageQuizScore}%</span></> : null}
            </p>
          </div>

          <div className="relative flex flex-col gap-2 border-t border-border pt-4 text-left text-[13px] text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
            <p>
              <span className="block font-medium text-foreground">Verified by unicodesnwrites</span>
              Check it at <span className="break-all font-mono text-[12px]">{verifyUrl}</span>
            </p>
            <p className="font-mono text-[12px] tracking-[0.04em]">Certificate ID {certificate.code}</p>
          </div>
        </article>

        <div className="mt-8 grid gap-4 text-[15px] leading-[1.6] text-muted-foreground sm:grid-cols-2 print:hidden">
          <p>
            <span className="font-medium text-foreground">Is this real?</span> Yes. This page lives on unicodesnwrites.tech, so if you can open it here,
            the certificate is genuine.
          </p>
          {certificate.courseSlug ? (
            <p>
              <span className="font-medium text-foreground">Want to learn this too?</span>{' '}
              <Link href={`/courses/${certificate.courseSlug}`} className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4">
                See the course
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
