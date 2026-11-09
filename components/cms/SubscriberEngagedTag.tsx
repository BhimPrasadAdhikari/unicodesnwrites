'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface EngagedTagResult {
    days: number;
    engaged: number;
    added: number;
    removed: number;
}

const WINDOWS = [30, 60, 90, 180];

export default function SubscriberEngagedTag() {
    const [days, setDays] = useState(90);
    const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
    const [result, setResult] = useState<EngagedTagResult | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();

    const handleRefresh = async () => {
        setStatus('working');
        try {
            const res = await fetch('/api/admin/subscribers/engaged', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Update failed');
            setResult(json);
            setStatus('done');
            router.refresh();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Update failed');
            setStatus('error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                    <span className="mb-1 block text-muted-foreground">Opened or clicked in the last</span>
                    <select
                        value={days}
                        onChange={(event) => setDays(Number(event.target.value))}
                        className="min-h-10 rounded-md border border-border bg-background px-3 text-sm"
                    >
                        {WINDOWS.map((window) => (
                            <option key={window} value={window}>{window} days</option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={status === 'working'}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
                >
                    {status === 'working' && <Loader2 className="h-4 w-4 animate-spin" />}
                    Update &ldquo;engaged&rdquo; tag
                </button>
            </div>
            {status === 'done' && result && (
                <p role="status" className="text-sm">
                    {result.engaged.toLocaleString()} confirmed subscribers are tagged &ldquo;engaged&rdquo; ({result.days} days): {result.added.toLocaleString()} added, {result.removed.toLocaleString()} removed.
                </p>
            )}
            {status === 'error' && (
                <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
            )}
        </div>
    );
}
