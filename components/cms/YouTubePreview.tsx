"use client";

import { AlertCircle, CheckCircle2, ExternalLink, Video } from "lucide-react";

import { extractYouTubeVideoId, getYouTubeEmbedUrl } from "@/lib/utils/youtube";

interface YouTubePreviewProps {
  rawInput: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export function YouTubePreview({
  rawInput,
  title = "Lesson Video Preview",
  className = "",
  compact = false,
}: YouTubePreviewProps) {
  const trimmed = rawInput.trim();
  const videoId = extractYouTubeVideoId(trimmed);
  const embedUrl = videoId ? getYouTubeEmbedUrl(videoId) : "";

  if (!trimmed) {
    if (compact) return null;
    return (
      <div className={`rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center ${className}`}>
        <Video className="mx-auto h-6 w-6 text-muted-foreground/60" />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Paste a YouTube link or 11-character video ID to preview the video player here.
        </p>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div
        className={`flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive ${className}`}
        role="alert"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold">Invalid YouTube video link</p>
          <p className="mt-0.5 opacity-90">
            Please enter a valid YouTube URL (e.g. <code className="rounded bg-destructive/20 px-1 py-0.5 text-2xs">https://youtube.com/watch?v=...</code> or <code className="rounded bg-destructive/20 px-1 py-0.5 text-2xs">https://youtu.be/...</code>) or an 11-character video ID.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 rounded-xl border border-success/30 bg-card p-3 transition-all ${className}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Valid YouTube Video</span>
          <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-2xs font-medium text-success">
            {videoId}
          </span>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-2xs font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          Watch on YouTube <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black shadow-inner">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
