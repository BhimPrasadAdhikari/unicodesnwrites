'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';

function ResetPasswordCard() {
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? '' : 'This reset link is missing or invalid.');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || 'Unable to reset your password.');
      else setSuccess(true);
    } catch {
      setError('Unable to reach the account service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell title="Choose a new password" description={success ? 'Your password was updated and existing sessions were signed out.' : 'Use 12+ characters with uppercase, lowercase, and a number.'}>
    {success ? <Button asChild className="h-12 w-full"><Link href="/login?changed=1">Continue to sign in</Link></Button> : <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">New password<Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={72} disabled={!token || loading} /></label>
      <label className="block space-y-2 text-sm font-medium">Confirm new password<Input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={12} maxLength={72} disabled={!token || loading} /></label>
      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error} Links last 30 minutes. <Link href="/forgot-password" className="font-semibold underline underline-offset-2">Request a new link</Link></p>}
      <Button className="h-12 w-full" disabled={!token || loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update password'}</Button>
    </form>}
  </AuthShell>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></main>}><ResetPasswordCard /></Suspense>;
}
