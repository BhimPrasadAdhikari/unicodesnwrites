'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, Save, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import { createNewsletterSchema } from '@/lib/utils/validations/newsletter';
import { Alert } from '@/components/ui/Alert';

const NewsletterEditor = dynamic(() => import('@/components/cms/NewsletterEditor'), {
    ssr: false,
    loading: () => (
        <div className="p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
    ),
});

export default function EditNewsletterPage({ params }: { params?: { id: string } }) {
    const router = useRouter();
    const isNew = !params?.id;
    // Existing campaigns start in a loading state so the empty form never renders
    // (and can never be saved over the stored draft) before the campaign arrives.
    const [isLoading, setIsLoading] = useState(!isNew);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    
    // Form State
    const [subject, setSubject] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [content, setContent] = useState('<p>Hello subscribers,</p>');

    useEffect(() => {
        if (!isNew && params?.id) {
            setIsLoading(true);
            setLoadError('');
            fetch(`/api/newsletters/${encodeURIComponent(params.id)}`)
                .then((res) => {
                    if (!res.ok) throw new Error('Campaign could not be loaded.');
                    return res.json();
                })
                .then(data => {
                    setSubject(data.subject);
                    setPreviewText(data.previewText || '');
                    setContent(data.content);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoadError(err instanceof Error ? err.message : 'Campaign could not be loaded.');
                    setIsLoading(false);
                });
        }
    }, [isNew, params?.id, reloadKey]);

    const handleSave = async () => {
        if (isLoading || loadError) return;
        const validation = createNewsletterSchema.safeParse({ subject, previewText, content });
        if (!validation.success) {
            setFeedback({ type: 'error', message: validation.error.issues[0]?.message || 'Check the campaign fields.' });
            return;
        }
        
        setIsSaving(true);
        setFeedback(null);
        const method = isNew ? 'POST' : 'PATCH';
        const url = isNew ? '/api/newsletters' : `/api/newsletters/${params?.id}`;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validation.data),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'Campaign could not be saved.');

            if (isNew) {
                router.push(`/dashboard/newsletters/${data._id}/edit`);
            } else {
                setSubject(validation.data.subject);
                setPreviewText(validation.data.previewText || '');
                setFeedback({ type: 'success', message: 'Draft saved.' });
            }
        } catch (error) {
            setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Campaign could not be saved.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" aria-label="Loading campaign" /></div>;
    }

    if (loadError) {
        return (
            <Alert variant="destructive" className="mx-auto max-w-xl p-8 text-center">
                <p className="font-semibold">{loadError}</p>
                <p className="mt-2">Nothing was changed. Editing is disabled until the saved campaign loads.</p>
                <Button className="mt-4" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>
            </Alert>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <DashboardPageHeader
                eyebrow="Email Campaign"
                title={isNew ? 'New Campaign' : 'Edit Campaign'}
                description="Draft the subject line, preview text, and content before scheduling or broadcasting to subscribers."
                action={(
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleSave} loading={isSaving} variant="outline">
                            {!isSaving && <Save className="h-4 w-4 mr-2" />}
                            Save Draft
                        </Button>
                        {!isNew && (
                            <Button onClick={() => router.push(`/dashboard/newsletters/${params?.id}/send`)}>
                                <Send className="h-4 w-4 mr-2" />
                                Next: Review & Send
                            </Button>
                        )}
                    </div>
                )}
            />

            {feedback && (
                <Alert role="status" variant={feedback.type === 'success' ? 'success' : 'destructive'}>
                    {feedback.message}
                </Alert>
            )}

            <Card>
                <CardContent className="space-y-4">
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-muted-foreground">Subject Line</label>
                        <input 
                            type="text" 
                            id="subject"
                            maxLength={150}
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            placeholder="e.g. Weekly Roundup: Top 5 AI Trends"
                        />
                    </div>
                    <div>
                        <label htmlFor="previewText" className="block text-sm font-medium text-muted-foreground">Preview Text</label>
                        <input 
                            type="text" 
                            id="previewText"
                            maxLength={200}
                            value={previewText}
                            onChange={(e) => setPreviewText(e.target.value)}
                            className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            placeholder="Appears in inbox preview (optional)"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Content</label>
                <NewsletterEditor value={content} onChange={setContent} />
            </div>
            
        </div>
    );
}
