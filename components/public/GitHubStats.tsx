'use client';

import React from 'react';
import { Star, GitFork, Circle } from 'lucide-react';

interface Stats {
  stars?: number;
  forks?: number;
  language?: string;
  lastUpdated?: string | Date;
}

interface GitHubStatsProps {
  stats: Stats;
  repoUrl?: string;
  compact?: boolean;
}

export default function GitHubStats({ stats, repoUrl, compact = false }: GitHubStatsProps) {
  if (!stats) return null;

  // Language color mapping
  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      'TypeScript': 'bg-blue-500',
      'JavaScript': 'bg-yellow-400',
      'Python': 'bg-green-500',
      'Rust': 'bg-orange-500',
      'Go': 'bg-cyan-500',
      'Java': 'bg-red-500',
      'C++': 'bg-pink-500',
      'C#': 'bg-purple-500',
    };
    return colors[lang] || 'bg-blue-500';
  };

  return (
    <a 
      href={repoUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors group ${compact ? 'text-xs' : 'text-sm'}`}
      onClick={(e) => !repoUrl && e.preventDefault()}
    >
      {/* Stars */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
        <span className="font-medium text-amber-600 dark:text-amber-400">{stats.stars || 0}</span>
      </div>

      {/* Forks */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
        <GitFork className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-medium text-blue-600 dark:text-blue-400">{stats.forks || 0}</span>
      </div>

      {/* Language */}
      {!compact && stats.language && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 border border-border group-hover:border-blue-500/20 transition-colors">
          <span className={`w-2.5 h-2.5 rounded-full ${getLanguageColor(stats.language)}`} />
          <span className="font-medium">{stats.language}</span>
        </div>
      )}
    </a>
  );
}
