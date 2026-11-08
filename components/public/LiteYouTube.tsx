'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getYouTubeEmbedUrl } from '@/lib/utils/youtube';

/**
 * Click-to-load YouTube facade: a lazy thumbnail until the visitor clicks,
 * then a youtube-nocookie player, so no YouTube scripts or cookies load with
 * the page.
 */
export function LiteYouTube({
  videoId,
  title,
  className,
}: {
  videoId: string;
  title: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(videoId);

  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted', className)}>
      {playing && embedUrl ? (
        <iframe
          src={`${embedUrl}&autoplay=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0"
        >
          <Image
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 768px) 560px, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-overlay transition group-hover:scale-105">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
