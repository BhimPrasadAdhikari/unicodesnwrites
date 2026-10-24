const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(value: string): string | null {
  const candidate = value.trim();
  if (YOUTUBE_ID_PATTERN.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtube-nocookie.com') {
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = url.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(pathParts[0]) ? pathParts[1] : null);
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId?: string): string {
  if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) return '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&cc_load_policy=1`;
}

export function isYouTubeVideoId(value: string): boolean {
  return YOUTUBE_ID_PATTERN.test(value);
}
