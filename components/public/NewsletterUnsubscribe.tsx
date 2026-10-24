'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { unsubscribeSchema } from '@/lib/utils/validations/newsletter';

export default function NewsletterUnsubscribe() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const linkValidation = unsubscribeSchema.safeParse({ email, token });

    const handleUnsubscribe = async () => {
        if (!linkValidation.success) {
            setStatus('error');
            setMessage('The unsubscribe link is invalid or incomplete.');
            return;
        }
        setStatus('loading');
        try {
            const res = await fetch('/api/newsletter/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(linkValidation.data),
            });
            
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to unsubscribe');
            
            setStatus('success');
            setMessage(data.message || 'You have been successfully unsubscribed.');
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    };

    if (!linkValidation.success) {
        return (
            <div className="max-w-md mx-auto py-12 px-4 text-center">
                <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
                <h1 className="mb-2 font-serif text-[28px] font-medium leading-tight">Invalid link</h1>
                <p className="text-muted-foreground mb-6">The unsubscribe link is missing required information.</p>
                <Link href="/" className="text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">Return home</Link>
            </div>
        );
    }

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16">
            <div className="w-full rounded-3xl border border-border bg-card p-8 text-center sm:p-10">
                {status === 'idle' && (
                    <>
                        <h1 className="mb-4 font-serif text-[28px] font-medium leading-tight">Leave the newsletter?</h1>
                        <p className="text-muted-foreground mb-6">
                            This will stop future issues from reaching <strong>{linkValidation.data.email}</strong>.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link 
                                href="/"
                                className="inline-flex h-11 items-center px-5 border border-foreground rounded-lg hover:bg-secondary transition-colors text-[15px] font-medium"
                            >
                                Cancel
                            </Link>
                            <button
                                onClick={handleUnsubscribe}
                                className="inline-flex h-11 items-center px-5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors text-[15px] font-medium"
                            >
                                Unsubscribe
                            </button>
                        </div>
                    </>
                )}

                {status === 'loading' && (
                    <div className="py-8">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground mb-4" />
                        <p>Processing...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-4">
                         <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                         <h2 className="mb-2 font-serif text-[28px] font-medium leading-tight">You&apos;re unsubscribed.</h2>
                         <p className="text-muted-foreground mb-6">{message}</p>
                         <p className="text-sm text-muted-foreground mb-6">
                            You can rejoin from the newsletter page whenever you choose.
                         </p>
                         <Link 
                            href="/"
                            className="inline-flex h-11 items-center px-5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors text-[15px] font-medium"
                        >
                            Return home
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-4">
                        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h2 className="mb-2 font-serif text-[28px] font-medium leading-tight">We couldn&apos;t update your subscription</h2>
                        <p className="text-muted-foreground mb-6">{message}</p>
                         <Link 
                            href="/contact"
                            className="text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                        >
                            Contact Support
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
