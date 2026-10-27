'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function SubscriberImport() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState('');
    // Bumped after every attempt so picking the same file again still fires onChange.
    const [inputKey, setInputKey] = useState(0);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setStatus('uploading');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/subscribers/import', {
                method: 'POST',
                body: formData,
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Upload failed');

            setResult(json);
            setStatus('success');
            router.refresh();
        } catch (error) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
            setStatus('error');
        } finally {
            setFile(null);
            setInputKey((key) => key + 1);
        }
    };

    return (
        <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-medium mb-4">Import Subscribers</h3>
            
            <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center text-center hover:bg-muted transition-colors">
                    <input 
                        key={inputKey}
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                        className="hidden" 
                        id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground font-medium">Click to upload CSV</span>
                        <span className="text-xs text-muted-foreground mt-1">Found {file ? 1 : 0} file(s)</span>
                    </label>
                    {file && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                            <FileText className="h-4 w-4" />
                            {file.name}
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={!file || status === 'uploading'}
                        className="bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                        Import Subscribers
                    </button>
                </div>

                {status === 'success' && result && (
                    <div className="bg-success/10 text-success p-4 rounded-md flex items-start gap-3">
                        <Check className="h-5 w-5 mt-0.5" />
                        <div>
                            <p className="font-medium">Import Successful</p>
                            <p className="text-sm">Added: {result.added}, Duplicates: {result.duplicates}, Invalid: {result.invalid}{result.suppressed ? `, Skipped (previously deleted): ${result.suppressed}` : ''}</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center gap-3">
                        <AlertCircle className="h-5 w-5" />
                        <p>{errorMessage || "Import failed. Please check your CSV format."}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
