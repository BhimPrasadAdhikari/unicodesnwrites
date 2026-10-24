'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RequestDownloadLinks() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState('sending');
    try {
      const response = await fetch('/api/purchases/request-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(data.message || data.error || 'Something went wrong.');
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setMessage('Network error. Try again.');
      setState('error');
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <label htmlFor="download-links-email" className="sr-only">Email used at checkout</label>
      <Input
        id="download-links-email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="h-11 flex-1"
      />
      <Button type="submit" variant="primary" className="h-11" disabled={state === 'sending'}>
        {state === 'sending' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending</> : 'Email me new links'}
      </Button>
      {message ? (
        <p role="status" className={`text-sm sm:basis-full ${state === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>
      ) : null}
    </form>
  );
}
