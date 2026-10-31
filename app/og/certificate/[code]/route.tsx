import { renderCertificateOgCard } from '@/lib/og/card';
import { getPublicCertificate } from '@/lib/services/certificates';
import { formatCertificateDate, isCertificateCode } from '@/lib/utils/certificate';

// next/og is too large for the Edge bundle on this plan (see app/opengraph-image.tsx).
export const runtime = 'nodejs';

/** Share image for a certificate (LinkedIn, X). Hidden, revoked or unknown codes get a 404. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isCertificateCode(code)) return new Response('Not found', { status: 404 });

  const certificate = await getPublicCertificate(code);
  if (!certificate) return new Response('Not found', { status: 404 });

  return renderCertificateOgCard({
    name: certificate.name,
    courseTitle: certificate.courseTitle,
    date: formatCertificateDate(certificate.completedAt),
    code: certificate.code,
  });
}
