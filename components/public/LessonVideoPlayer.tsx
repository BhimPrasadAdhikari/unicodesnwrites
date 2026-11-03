'use client';

import { useCallback, useEffect, useRef } from 'react';

type PlayerProps = {
  embedUrl: string;
  videoUrl?: string;
  posterUrl?: string;
  title: string;
  initialPositionSeconds: number;
  seekToSeconds: number;
  onPositionChange(position: number): void;
};

export function LessonVideoPlayer(props: PlayerProps) {
  return props.videoUrl ? <FileVideoPlayer {...props} videoUrl={props.videoUrl} /> : <YouTubePlayer {...props} />;
}

function FileVideoPlayer({
  videoUrl,
  posterUrl,
  title,
  initialPositionSeconds,
  seekToSeconds,
  onPositionChange,
}: PlayerProps & { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const report = () => onPositionChange(Math.max(0, Math.floor(video.currentTime)));
    video.addEventListener('timeupdate', report);
    video.addEventListener('pause', report);
    return () => {
      video.removeEventListener('timeupdate', report);
      video.removeEventListener('pause', report);
    };
  }, [onPositionChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekToSeconds < 0) return;
    video.currentTime = seekToSeconds;
    onPositionChange(seekToSeconds);
  }, [onPositionChange, seekToSeconds]);

  return (
    <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
      <video
        ref={videoRef}
        className="h-full w-full"
        src={`${videoUrl}#t=${Math.floor(initialPositionSeconds)}`}
        poster={posterUrl || undefined}
        title={title}
        controls
        playsInline
        preload="metadata"
      />
    </div>
  );
}

function YouTubePlayer({
  embedUrl,
  title,
  initialPositionSeconds,
  seekToSeconds,
  onPositionChange,
}: PlayerProps) {
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
