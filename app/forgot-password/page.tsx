'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || 'Unable to request a reset link.');
      else setMessage(data.message);
    } catch {
      setError('Unable to reach the account service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell title="Reset your password" description="Enter the email you signed up with. We will send you a link to reset your password. It works once and lasts 30 minutes." back={{ href: '/login', label: 'Back to sign in' }}>
        <form onSubmit={submit} className="space-y-4"><label className="block space-y-2 text-sm font-medium"><span>Email</span><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} /></label>
          {message && <p role="status" className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">{message}</p>}
          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send reset link'}</Button>
        </form>
  </AuthShell>;
}
