'use client';

import { useCallback, useEffect, useRef } from 'react';

export function LessonVideoPlayer({
  embedUrl,
  title,
  initialPositionSeconds,
  seekToSeconds,
  onPositionChange,
}: {
  embedUrl: string;
  title: string;
  initialPositionSeconds: number;
  seekToSeconds: number;
  onPositionChange(position: number): void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const latestPosition = useRef(initialPositionSeconds);
  const source = `${embedUrl}&enablejsapi=1&playsinline=1&start=${Math.floor(initialPositionSeconds)}`;

  const command = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  }, []);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!['https://www.youtube.com', 'https://www.youtube-nocookie.com'].includes(event.origin)) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      let payload: unknown = event.data;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (!payload || typeof payload !== 'object' || !('info' in payload)) return;
      const info = (payload as { info?: { currentTime?: unknown } }).info;
      if (typeof info?.currentTime !== 'number' || !Number.isFinite(info.currentTime)) return;
      const position = Math.max(0, Math.floor(info.currentTime));
      latestPosition.current = position;
      onPositionChange(position);
    };
    window.addEventListener('message', receive);
    const poll = window.setInterval(() => command('getCurrentTime'), 15_000);
    return () => {
      window.removeEventListener('message', receive);
      window.clearInterval(poll);
    };
  }, [command, onPositionChange]);

  useEffect(() => {
    if (seekToSeconds < 0) return;
    latestPosition.current = seekToSeconds;
    command('seekTo', [seekToSeconds, true]);
    onPositionChange(seekToSeconds);
  }, [command, onPositionChange, seekToSeconds]);

  return <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-overlay"><iframe ref={iframeRef} className="h-full w-full" src={source} title={title} onLoad={() => command('getCurrentTime')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>;
}
