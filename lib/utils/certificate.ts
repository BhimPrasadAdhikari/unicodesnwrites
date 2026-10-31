import { siteConfig } from '@/lib/config/site.config';

/** Certificate codes: 10 characters from an alphabet without look-alikes (no 0/O, 1/I). */
export const CERTIFICATE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CERTIFICATE_CODE_LENGTH = 10;
export const CERTIFICATE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{10}$/;

export const isCertificateCode = (value: string | null | undefined): value is string =>
  typeof value === 'string' && CERTIFICATE_CODE_PATTERN.test(value);

/** What learner-facing screens need to show and share a certificate. */
export type LearnerCertificate = {
  id: string;
  code: string;
  courseTitle: string;
  courseSlug: string | null;
  /** The name printed on the certificate */
  name: string;
  /** The account name it was issued to (used when the learner clears their chosen name) */
  learnerName: string;
  displayName: string;
  completedAt: string;
  hidden: boolean;
};

export function certificatePath(code: string) {
  return `/certificates/${code}`;
}

export function certificateUrl(code: string) {
  return `https://${siteConfig.domain}${certificatePath(code)}`;
}

/** Dates on certificates are calendar days in UTC, so every viewer sees the same day. */
export function formatCertificateDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** LinkedIn's "Add licence or certification" form, filled in. */
export function linkedInAddToProfileUrl({ code, courseTitle, completedAt }: { code: string; courseTitle: string; completedAt: string | Date }) {
  const date = new Date(completedAt);
  const params: Array<[string, string]> = [
    ['startTask', 'CERTIFICATION_NAME'],
    ['name', courseTitle],
    ['organizationName', siteConfig.name],
    ['issueYear', String(date.getUTCFullYear())],
    ['issueMonth', String(date.getUTCMonth() + 1)],
    ['certUrl', certificateUrl(code)],
    ['certId', code],
  ];
  return `https://www.linkedin.com/profile/add?${params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}
