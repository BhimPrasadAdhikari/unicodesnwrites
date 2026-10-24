"use client";

import { useState, useEffect } from 'react';
import { Loader2, Trash2, Eye, Shield, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function PrivacyTools() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<unknown>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // Get session ID from local storage used by our analytics script
    const stored = localStorage.getItem('analytics-session-id');
    if (stored) setSessionId(stored);
  }, []);

  const handleFetch = async () => {
    if (!sessionId) return;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
      setMessage({ text: 'The local analytics session identifier is invalid.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/analytics/privacy?sessionId=${encodeURIComponent(sessionId)}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setMessage({ text: json.error || 'Failed to fetch data', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error fetching data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionId) return;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
      setMessage({ text: 'The local analytics session identifier is invalid.', type: 'error' });
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      setMessage(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/privacy?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        setData(null);
        setMessage({ text: json.message, type: 'success' });
        localStorage.removeItem('analytics-session-id'); // Clear local storage too
        setSessionId(null);
        setConfirmDelete(false);
      } else {
        setMessage({ text: json.error || 'Failed to delete data', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error deleting data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <Card className="border-success/30 bg-success/10">
        <CardContent className="pt-6 flex items-center gap-4">
           <Shield className="h-8 w-8 text-success" />
           <div>
              <p className="font-medium text-success">No Active Tracking Session</p>
              <p className="text-sm text-success">
                 No publication analytics session is linked to this browser. Hosting providers may still process necessary request data.
              </p>
           </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
           Your Privacy Data
           <Badge variant="outline" className="font-mono text-xs max-w-[150px] truncate" title={sessionId}>
              ID: {sessionId}
           </Badge>
        </CardTitle>
        <CardDescription>
           We identify your session using an anonymous ID stored in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 flex-wrap">
          <Button
            onClick={handleFetch}
            disabled={loading}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            View My Data
          </Button>
          
          <Button
            onClick={handleDelete}
            disabled={loading}
            variant="destructive"
            className="flex-1 sm:flex-none"
          >
             {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
             {confirmDelete ? 'Confirm deletion' : 'Delete my data'}
          </Button>
          {confirmDelete && (
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={loading}>Cancel</Button>
          )}
        </div>

        {message && (
          <div role="status" className={`p-3 rounded text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        {data !== null && (
          <div className="border rounded-md p-4 bg-muted/50">
             <h4 className="font-semibold mb-2 text-sm">Stored Data JSON:</h4>
             <div className="bg-background text-foreground border border-border p-4 rounded-md overflow-auto max-h-80 text-xs font-mono">
                <pre>{JSON.stringify(data, null, 2)}</pre>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
