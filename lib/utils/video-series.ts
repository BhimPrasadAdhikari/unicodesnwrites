/** Plain (serializable) shapes and pure helpers for video series. No DB access here. */

export interface VideoPartView {
  /** 1-based position in the series. */
  part: number;
  title: string;
  videoId: string;
  summary: string;
  /** ISO timestamp when the video becomes public. */
  publishAt: string;
  keywords: string[];
}

export interface VideoSeriesView {
  id: string;
  slug: string;
  title: string;
  description: string;
  featured: boolean;
  parts: VideoPartView[];
}

export function videoSeriesPath(slug: string): string {
  return `/videos/${slug}`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function isPartReleased(part: Pick<VideoPartView, 'publishAt'>, now: Date = new Date()): boolean {
  return new Date(part.publishAt).getTime() <= now.getTime();
}

export function releasedParts(series: VideoSeriesView, now: Date = new Date()): VideoPartView[] {
  return series.parts.filter((part) => isPartReleased(part, now));
}

/** "15 Nov, 19:30 IST" */
export function formatPartReleaseDate(part: Pick<VideoPartView, 'publishAt'>): string {
  const date = new Date(part.publishAt);
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(date);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(date);
  return `${day}, ${time} IST`;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** ISO timestamp -> `YYYY-MM-DDTHH:mm` in IST, for <input type="datetime-local">. Same result on server and browser. */
export function toIstDateTimeLocal(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  return new Date(time + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** `YYYY-MM-DDTHH:mm` read as IST -> Date, or null when invalid. */
export function fromIstDateTimeLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const normalize = (value: string) => value.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Pick the released part that best matches a blog post, scoring keyword hits
 * in its title (3), tags (2) and excerpt (1). Returns null when nothing matches.
 */
export function findPartForPost(
  seriesList: VideoSeriesView[],
  post: { title?: string; tags?: string[]; excerpt?: string },
  now: Date = new Date(),
): { series: VideoSeriesView; part: VideoPartView } | null {
  const title = normalize(post.title || '');
  const tags = (post.tags || []).map(normalize);
  const excerpt = normalize(post.excerpt || '');

  let best: { series: VideoSeriesView; part: VideoPartView; score: number } | null = null;
  for (const series of seriesList) {
    for (const part of series.parts) {
      if (!isPartReleased(part, now)) continue;
      let score = 0;
      for (const raw of part.keywords) {
        const keyword = normalize(raw);
        if (!keyword) continue;
        if (title.includes(keyword)) score += 3;
        if (tags.some((tag) => tag.includes(keyword))) score += 2;
        if (excerpt.includes(keyword)) score += 1;
      }
      if (score > 0 && (!best || score > best.score)) best = { series, part, score };
    }
  }
  return best ? { series: best.series, part: best.part } : null;
}
