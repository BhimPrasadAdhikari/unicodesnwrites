'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get('from');
  const returnTo = requested?.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\') ? requested : null;
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, returnTo }) });
      const data = await response.json();
      if (!response.ok) return setError(data.error || 'Unable to create account.');
      router.push(`/verify-email?sent=1&email=${encodeURIComponent(form.email)}${returnTo ? `&from=${encodeURIComponent(returnTo)}` : ''}`);
    } catch {
      setError('Unable to reach the account service. Check your connection and try again.');
    } finally { setLoading(false); }
  };

  return <AuthShell eyebrow="Create account" title="Start learning modern AI." description="Enroll in courses, keep a notebook and track your progress." back={{ href: returnTo || '/courses', label: 'Back' }}><form onSubmit={submit} className="space-y-4"><label className="block space-y-2 text-sm font-medium">Name<Input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={80} /></label><label className="block space-y-2 text-sm font-medium">Email<Input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label className="block space-y-2 text-sm font-medium">Password<Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={12} maxLength={72} /></label><p className="flex gap-2 text-xs leading-5 text-muted-foreground">Use 12+ characters with uppercase, lowercase, and a number.</p>{error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button variant="primary" className="h-12 w-full" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : 'Create account'}</Button></form><p className="mt-6 text-center text-sm text-muted-foreground">Already verified? <Link href={returnTo ? `/login?from=${encodeURIComponent(returnTo)}` : '/login'} className="font-semibold text-foreground">Sign in</Link></p></AuthShell>;
}

export default function SignupPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></main>}><SignupForm /></Suspense>;
}
