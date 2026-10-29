'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import {
  WELCOME_INTRO_MAX,
  WELCOME_SUBJECT_MAX,
  welcomeSeriesUpdateSchema,
  type WelcomeSeriesSettings,
} from '@/lib/utils/validations/welcome-series';

const fieldStyles = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50';

export default function WelcomeSeriesEditor({ settings }: { settings: WelcomeSeriesSettings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  // Step 0 is the existing welcome email; only the scheduled steps are editable.
  const [steps, setSteps] = useState(settings.steps.slice(1).map(({ subject, intro }) => ({ subject, intro })));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (index: number, field: 'subject' | 'intro', value: string) =>
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, [field]: value } : step)));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const parsed = welcomeSeriesUpdateSchema.safeParse({ enabled, steps });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check the steps and try again.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/newsletters/welcome-series', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Welcome series could not be saved.');
      setMessage(payload?.message || 'Saved.');
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Welcome series could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={saving}
            className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
          />
          <span>
            <span className="block text-sm font-semibold">Send the welcome series</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Applies to readers who confirm from now on. Existing subscribers are never added. Turning it off pauses
              anyone mid-series until it is turned back on.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-eyebrow text-muted-foreground">Day 0</p>
        <h2 className="mt-1 text-base font-semibold">{settings.steps[0].subject}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The existing welcome email, sent the moment a reader confirms (whether or not the series is on).
        </p>
      </section>

      {steps.map((step, index) => {
        const stored = settings.steps[index + 1];
        const subjectId = `welcome-step-${index + 1}-subject`;
        const introId = `welcome-step-${index + 1}-intro`;
        return (
          <section key={subjectId} className="space-y-3 rounded-xl border border-border bg-card p-5">
            <div>
              <p className="text-eyebrow text-muted-foreground">Day {stored.delayDays}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {index === 0
                  ? 'Start here: the newest series matching their tags (or the most-read articles), picked when it sends.'
                  : 'Go deeper: the most relevant published course and the tools page, picked when it sends.'}
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={subjectId} className="text-sm font-medium">Subject</label>
              <input
                id={subjectId}
                type="text"
                maxLength={WELCOME_SUBJECT_MAX}
                value={step.subject}
                onChange={(event) => updateStep(index, 'subject', event.target.value)}
                disabled={saving}
                className={fieldStyles}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={introId} className="text-sm font-medium">Intro</label>
              <textarea
                id={introId}
                rows={4}
                maxLength={WELCOME_INTRO_MAX}
                value={step.intro}
                onChange={(event) => updateStep(index, 'intro', event.target.value)}
                disabled={saving}
                className={fieldStyles}
              />
              <p className="text-2xs text-muted-foreground">Plain text; a blank line starts a new paragraph. {step.intro.length}/{WELCOME_INTRO_MAX}</p>
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-50">
          {saving && <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />} Save
        </button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}
