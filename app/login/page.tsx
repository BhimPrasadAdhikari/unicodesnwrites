'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { getSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { safeInternalPath } from '@/lib/utils/safe-path';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const requested = searchParams.get('from');
  const returnTo = safeInternalPath(requested, null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Email or password is incorrect, or the email still needs verification.');
        setLoading(false); return;
      }
      const session = await getSession();
      if (!session?.user?.sessionValid) {
        setError('Your credentials were accepted, but the session could not be validated. Please try again.');
        setLoading(false);
        return;
      }
      router.push(returnTo || (session?.user.role === 'admin' ? '/dashboard' : '/learn'));
      router.refresh();
    } catch {
      setError('An unexpected error occurred.'); setLoading(false);
    }
  };

  const resend = async () => {
    setResendMessage('Sending...');
    try {
      const response = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, returnTo }) });
      const data = await response.json(); setResendMessage(data.message || data.error);
    } catch {
      setResendMessage('Unable to send right now. Check your connection and try again.');
    }
  };

  return <form onSubmit={handleSubmit} className="space-y-5">
    <label className="block space-y-2" htmlFor="email"><span className="text-sm font-medium">Email</span><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required disabled={loading} className="h-12" /></label>
    <label className="block space-y-2" htmlFor="password"><span className="text-sm font-medium">Password</span><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required disabled={loading} className="h-12" /></label>
    {searchParams.get('changed') === '1' && <div role="status" className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">Password updated. Sign in with your new password.</div>}
    {error && <Alert variant="destructive" className="p-3">{error}</Alert>}
    <div className="flex justify-end"><Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-primary decoration-2 underline-offset-4">Forgot password?</Link></div>
    <Button type="submit" disabled={loading} className="h-12 w-full">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : 'Sign in'}</Button>
    <div id="resend" className="rounded-lg border border-border bg-background p-4 text-sm"><p className="font-semibold">Email not verified?</p><button type="button" disabled={!email || loading} onClick={resend} className="mt-1 min-h-11 text-left font-medium underline decoration-primary decoration-2 underline-offset-4 disabled:opacity-50">Resend verification email</button>{resendMessage && <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">{resendMessage}</p>}</div>
    <p className="text-center text-sm text-muted-foreground">Don&apos;t have an account? <Link href={returnTo ? `/signup?from=${encodeURIComponent(returnTo)}` : '/signup'} className="font-semibold text-foreground">Create an account</Link></p>
  </form>;
}

export default function LoginPage() {
  return <AuthShell title="Welcome back." description="Sign in to continue learning."><Suspense fallback={<Loader2 className="mx-auto animate-spin" />}><LoginForm /></Suspense></AuthShell>;
}
