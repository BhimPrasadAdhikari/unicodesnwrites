'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';
import { safeInternalPath } from '@/lib/utils/safe-path';

function VerificationCard() {
  const search = useSearchParams();
  const token = search.get('token');
  const sent = search.get('sent') === '1';
  const requested = search.get('from');
  const returnTo = safeInternalPath(requested, null);
  const loginHref = returnTo ? `/login?from=${encodeURIComponent(returnTo)}` : '/login';
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>(token ? 'idle' : sent ? 'success' : 'error');
  const [message, setMessage] = useState(sent ? 'Check your inbox. The verification link expires in 30 minutes.' : token ? 'Confirm below to verify this email address.' : 'Your email isn’t verified yet. Request a fresh verification link to continue.');
  const [password, setPassword] = useState('');

  const verify = async () => {
    setState('loading');
    try {
      const response = await fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      setState(response.ok ? 'success' : 'error'); setMessage(data.message || data.error);
      if (response.ok) window.history.replaceState({}, '', `/verify-email?verified=1${returnTo ? `&from=${encodeURIComponent(returnTo)}` : ''}`);
    } catch {
      setState('error'); setMessage('Verification could not be completed. Check your connection and try again.');
    }
  };

  const resendHref = `${loginHref}${loginHref.includes('?') ? '&' : '?'}resend=1#resend`;
  return <AuthShell eyebrow={state === 'success' ? 'Check your inbox' : undefined} title="Verify your email" description={state === 'error' ? undefined : message}>{state === 'error' && <p role="alert" className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{message} {token ? <>Forgot the password you signed up with? <Link href="/forgot-password" className="font-semibold underline underline-offset-2">Reset it</Link> and your email is verified at the same time.</> : null}</p>}{token && state !== 'success' && <div className="space-y-3"><label className="block space-y-2 text-sm font-medium">Confirm your account password<Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={72} required /></label><p className="text-xs leading-5 text-muted-foreground">This prevents someone else from pre-registering your email with a password they control.</p><Button onClick={verify} disabled={state === 'loading' || !password} className="h-12 w-full">{state === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Verify email address'}</Button></div>}{state === 'success' && !sent && <Button asChild className="h-12 w-full"><Link href={loginHref}>Continue to sign in</Link></Button>}<p className="mt-5 text-center text-sm text-muted-foreground">Need another email? <Link href={resendHref} className="font-semibold text-foreground">Resend from sign in</Link></p></AuthShell>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></main>}><VerificationCard /></Suspense>;
}
