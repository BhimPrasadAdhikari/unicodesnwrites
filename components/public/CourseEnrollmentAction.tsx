'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, Play } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

type Props = { slug: string; firstLessonSlug: string | null; authenticated: boolean; verified: boolean; enrolled: boolean };

export function CourseEnrollmentAction({ slug, firstLessonSlug, authenticated, verified, enrolled }: Props) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const { trackEvent } = useAnalytics();
  const coursePath = `/courses/${slug}`;
  const lessonPath = firstLessonSlug ? `/courses/${slug}/learn/${firstLessonSlug}` : coursePath;
  if (!authenticated) return <Link href={`/login?from=${encodeURIComponent(coursePath)}`} className="inline-flex h-12 items-center gap-2 rounded-lg bg-foreground px-6 text-[15px] font-medium text-background hover:bg-foreground/90"><LogIn className="h-4 w-4" /> Sign in to start</Link>;
  if (!verified) return <Link href={`/verify-email?from=${encodeURIComponent(coursePath)}`} className="inline-flex h-12 items-center gap-2 rounded-lg bg-foreground px-6 text-[15px] font-medium text-background hover:bg-foreground/90"><LogIn className="h-4 w-4" /> Confirm your email to start</Link>;
  if (enrolled) return <Link href={lessonPath} className="inline-flex h-12 items-center gap-2 rounded-lg bg-foreground px-6 text-[15px] font-medium text-background hover:bg-foreground/90"><Play className="h-4 w-4 fill-current" /> Continue learning</Link>;
  return <div><button type="button" disabled={loading} onClick={async () => { setLoading(true); setError(''); trackEvent('course_enroll_click', { slug }); try { const response = await fetch(`/api/courses/${encodeURIComponent(slug)}/enroll`, { method: 'POST' }); const data = await response.json(); if (response.ok) { trackEvent('course_enrollment_success', { slug }); router.push(lessonPath); router.refresh(); } else { trackEvent('course_enrollment_error', { slug, status: response.status }); setError(data.error || 'Unable to enroll.'); setLoading(false); } } catch { trackEvent('course_enrollment_error', { slug, status: 'network' }); setError('Could not start the course. Check your internet and try again.'); setLoading(false); } }} className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />} Start for free</button>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</div>;
}
