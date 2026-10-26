import Link from 'next/link';

const legalLinks = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refunds' },
  { href: '/shipping-policy', label: 'Delivery' },
];

export function LegalNav({ current }: { current: string }) {
  return (
    <nav aria-label="Legal" className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
      {legalLinks.map((link) => {
        const active = link.href === current;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px inline-flex h-11 shrink-0 items-center border-b-2 px-3.5 text-[15px] ${active ? 'border-primary font-semibold text-foreground' : 'border-transparent font-medium text-muted-foreground hover:text-foreground'}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BusinessDetails({ legalName, website, supportEmail, supportPhone, postalAddress }: {
  legalName: string;
  website: string;
  supportEmail: string;
  supportPhone?: string;
  postalAddress?: string;
}) {
  return (
    <dl className="mt-4 grid gap-3 rounded-xl border border-border bg-card px-5 py-4 font-sans text-[15px] sm:grid-cols-[max-content_1fr] sm:gap-x-6">
      <dt className="text-muted-foreground">Operated by</dt>
      <dd className="text-foreground">{legalName} (<a href={website} className="underline underline-offset-2">{website.replace('https://', '')}</a>)</dd>
      <dt className="text-muted-foreground">Email</dt>
      <dd><a href={`mailto:${supportEmail}`} className="text-foreground underline underline-offset-2">{supportEmail}</a></dd>
      {supportPhone ? (
        <>
          <dt className="text-muted-foreground">Phone</dt>
          <dd><a href={`tel:${supportPhone.replace(/\s+/g, '')}`} className="text-foreground underline underline-offset-2">{supportPhone}</a></dd>
        </>
      ) : null}
      {postalAddress ? (
        <>
          <dt className="text-muted-foreground">Address</dt>
          <dd className="whitespace-pre-line text-foreground">{postalAddress}</dd>
        </>
      ) : null}
    </dl>
  );
}
