"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

import { getYouTubeEmbedUrl } from "@/lib/utils/youtube";

/** Course trailer in the hero: a thumbnail that turns into the YouTube player on click, so the page stays light until asked. */
export function CourseTrailer({
  videoId,
  title,
  caption,
  durationLabel,
}: {
  videoId: string;
  title: string;
  caption: string;
  durationLabel?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(videoId);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="relative aspect-video bg-muted">
        {playing && embedUrl ? (
          <iframe
            src={`${embedUrl}&autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play the trailer: ${title}`}
            className="group absolute inset-0"
          >
            <Image
              src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
              alt=""
              fill
              sizes="(min-width: 1024px) 540px, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              priority
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-overlay transition group-hover:scale-105">
                <Play className="ml-1 h-6 w-6 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <span className="min-w-0">
          <span className="block text-eyebrow text-muted-foreground">Watch the trailer</span>
          <span className="mt-0.5 block truncate font-medium">{caption}</span>
        </span>
        {durationLabel ? (
          <span className="shrink-0 font-mono text-[12px] text-muted-foreground">{durationLabel}</span>
        ) : null}
      </div>
    </div>
  );
}
