import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { StatusPage } from '@/components/ui/StatusPage';

/** Unknown, hidden or withdrawn certificates all look the same, so nothing leaks about which. */
export default function CertificateNotFound() {
  return (
    <StatusPage
      label="404 · CERTIFICATE NOT FOUND"
      title="This certificate can't be found."
      description="The link may be mistyped, or the certificate's owner may have hidden it. If someone sent you this link, ask them for a fresh one."
      actions={
        <>
          <Button size="lg" asChild><Link href="/courses">See the courses</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/">Back to home</Link></Button>
        </>
      }
    />
  );
}
