'use client';

import React, { useState } from 'react';

interface GitHubRepoInputProps {
  value: string;
  onChange: (value: string) => void;
  onStatsFetched: (stats: GitHubStats) => void;
}

interface GitHubStats {
  stars: number;
  forks: number;
  language?: string;
  lastUpdated: string;
  description?: string;
}

export default function GitHubRepoInput({ value, onChange, onStatsFetched }: GitHubRepoInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!value) return;
    
    // Very basic client-side validation first
    if (!parseGitHubUrl(value).owner) {
        setError('Please enter a valid GitHub repository URL');
        return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Need a temporary project ID or just use a direct utility API?
      // Since our API route assumes a project ID for syncing, we might need a separate loose endpoint?
      // Actually, for creating a NEW project, we don't have an ID yet. 
      // So we should probably expose the GitHub service logic via a public query param or a separate non-resource API
      // OR, we just fetch from client side directly to GitHub API for preview?
      // Direct client side to GitHub API is prone to rate limits (60/hr).
      // Better to have a dedicated utility endpoint: /api/utils/github-stats?url=...
      
      // For now, let's create a quick utility API or reuse logic.
      // Since we didn't plan a utility route, let's just do client fetch for now, and if it fails, warn user.
      // But wait, user might have token in .env on server.
      // Let's rely on user manually entering stats if auto-fetch fails?
      // No, let's do it right. We can create a dedicated route for this if needed, or...
      // Let's assume for creation flow we might just want to store the URL, and the server fetches stats on CREATE/UPDATE.
      
      // Let's try to hit a robust implementation: POST to check endpoint?
      
      // IMPLEMENTATION:
      // We will actually just extract the owner/repo here and use the `github.com/repos/...` public API (rate limited)
      // If that fails, we show a message.
      
      const { owner, repo } = parseGitHubUrl(value);
      if (!owner || !repo) throw new Error("Invalid URL format");
      
      const res = await fetch('/api/github-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: value }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to fetch GitHub stats');
      }

      const data = await res.json();

      onStatsFetched({
        stars: data.stats.stars,
        forks: data.stats.forks,
        language: data.stats.language,
        lastUpdated: data.stats.lastUpdated,
        description: data.stats.description,
      });
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      // If client fetch fails, server might still succeed with token later
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">GitHub Repository URL</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => {
              onChange(e.target.value);
              setError('');
          }}
          className="block w-full rounded-md border-border bg-background text-foreground focus:border-primary focus:ring-primary sm:text-sm p-2 border placeholder:text-muted-foreground"
          placeholder="https://github.com/username/repo"
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={!value || isLoading}
          className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 disabled:opacity-50 text-sm font-medium"
        >
          {isLoading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
      <p className="mt-1 text-xs text-muted-foreground">Uses the server to fetch stats (avoids public rate limits).</p>
    </div>
  );
}

function parseGitHubUrl(url: string) {
    try {
        const urlObj = new URL(url);
        if (!['github.com', 'www.github.com'].includes(urlObj.hostname.toLowerCase())) {
          return { owner: null, repo: null };
        }
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length !== 2 || !parts.every((part) => /^[a-z\d](?:[a-z\d_.-]{0,99})$/i.test(part))) {
          return { owner: null, repo: null };
        }
        return { owner: parts[0], repo: parts[1] };
    } catch {
        return { owner: null, repo: null };
    }
}
