'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { CertificateActions } from '@/components/public/CertificateActions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SiteIcon } from '@/components/ui/SiteIcon';
import { formatCertificateDate, type LearnerCertificate } from '@/lib/utils/certificate';

type Feedback = { type: 'success' | 'error'; text: string } | null;

function CertificateRow({ initial }: { initial: LearnerCertificate }) {
  const [certificate, setCertificate] = useState(initial);
  const [name, setName] = useState(initial.displayName);
  const [saving, setSaving] = useState<'name' | 'hidden' | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const save = async (changes: { displayName?: string; hidden?: boolean }, kind: 'name' | 'hidden') => {
    setSaving(kind);
    setFeedback(null);
    try {
      const response = await fetch(`/api/account/certificates/${certificate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save that change.');
      setCertificate(data.certificate);
      setName(data.certificate.displayName);
      setFeedback({ type: 'success', text: data.message || 'Saved.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Could not save that change.' });
    } finally {
      setSaving(null);
    }
  };

  const inputId = `certificate-name-${certificate.id}`;
  return (
    <li className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <SiteIcon kind="learning" size={36} className="mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-medium leading-snug">
            {certificate.courseSlug ? <Link href={`/courses/${certificate.courseSlug}`} className="hover:text-primary">{certificate.courseTitle}</Link> : certificate.courseTitle}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Finished {formatCertificateDate(certificate.completedAt)} · {certificate.hidden ? 'Hidden' : 'Anyone with the link can see it'}
          </p>
        </div>
      </div>

      <CertificateActions certificate={certificate} compact className="mt-4" />

      <form
        className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          save({ displayName: name.trim() }, 'name');
        }}
      >
        <div>
          <label htmlFor={inputId} className="text-sm font-medium">Name on the certificate</label>
          <Input
            id={inputId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder={certificate.learnerName}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">Leave it empty to use your account name ({certificate.learnerName}).</p>
        </div>
        <Button type="submit" variant="outline" disabled={saving !== null} className="sm:mb-5">
          {saving === 'name' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save name
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {certificate.hidden ? 'Hidden: the link shows "can\'t be found" to everyone.' : 'Hide it if you don\'t want the link to work any more.'}
        </p>
        <Button type="button" variant="outline" size="sm" disabled={saving !== null} onClick={() => save({ hidden: !certificate.hidden }, 'hidden')}>
          {saving === 'hidden' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {certificate.hidden ? 'Show certificate' : 'Hide certificate'}
        </Button>
      </div>

      {feedback ? (
        <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${feedback.type === 'error' ? 'text-destructive' : 'text-success'}`}>
          {feedback.text}
        </p>
      ) : null}
    </li>
  );
}

/** "Your certificates" in the account Learning tab: share, rename or hide each one. */
export function CertificateSettings({ certificates }: { certificates: LearnerCertificate[] }) {
  if (!certificates.length) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Finish every lesson in a course and you&apos;ll get a certificate you can share on LinkedIn.{' '}
        <Link href="/learn" className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4">Go to my courses</Link>
      </p>
    );
  }
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {certificates.map((certificate) => <CertificateRow key={certificate.id} initial={certificate} />)}
    </ul>
  );
}
