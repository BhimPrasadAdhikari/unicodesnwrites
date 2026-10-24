import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import type { ITranscriptCue } from '@/lib/models/Course';
import { extractYouTubeVideoId } from '@/lib/utils/youtube';
export type { ITranscriptCue };
export { extractYouTubeVideoId };

export type YouTubeTranscriptErrorCode =
  | 'INVALID_YOUTUBE_URL'
  | 'YOUTUBE_TRANSCRIPT_EMPTY'
  | 'YOUTUBE_TRANSCRIPT_DISABLED'
  | 'YOUTUBE_VIDEO_UNAVAILABLE'
  | 'YOUTUBE_RATE_LIMITED'
  | 'YOUTUBE_REQUEST_BLOCKED'
  | 'YOUTUBE_PROXY_MISCONFIGURED'
  | 'YOUTUBE_TRANSCRIPT_FETCH_FAILED';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type RawCue = { text: string; offset: number; duration: number };

// youtube-transcript returns integer milliseconds for srv3 tracks and float
// seconds for classic tracks, so the unit must be decided per transcript.
function usesMilliseconds(rawCues: RawCue[]): boolean {
  const allIntegers = rawCues.every(
    (cue) => Number.isInteger(Number(cue.offset)) && Number.isInteger(Number(cue.duration || 0)),
  );
  if (!allIntegers) return false;
  const durations = rawCues
    .map((cue) => Number(cue.duration || 0))
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  const median = durations[Math.floor(durations.length / 2)] ?? 0;
  return median > 50;
}

type PlayabilityStatus = { status: string; reason?: string };

// YouTube blocks caption requests from most cloud IPs (including Vercel), so
// hosted deployments can route them through a proxy, e.g.
// YOUTUBE_PROXY_URL=http://user:pass@proxy.example.com:8080
let cachedProxy: { url: string; agent: ProxyAgent } | null = null;

function getBaseFetch(): typeof fetch {
  const proxyUrl = process.env.YOUTUBE_PROXY_URL?.trim();
  if (!proxyUrl) return fetch;
  if (cachedProxy?.url !== proxyUrl) {
    try {
      cachedProxy = { url: proxyUrl, agent: new ProxyAgent(proxyUrl) };
    } catch {
      throw new Error('YOUTUBE_PROXY_MISCONFIGURED');
    }
  }
  const { agent } = cachedProxy;
  return ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
    undiciFetch(input as Parameters<typeof undiciFetch>[0], {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher: agent,
    })) as unknown as typeof fetch;
}

// Wraps fetch so we can see what YouTube said about the video. The library
// reports "captions disabled" whenever it finds no caption tracks, which also
// happens when YouTube refuses the request (bot check, login wall) — common
// from cloud/datacenter IPs. Recording playabilityStatus tells the two apart.
function createObservingFetch(baseFetch: typeof fetch, statuses: PlayabilityStatus[]): typeof fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    try {
      if (url.includes('/youtubei/v1/player')) {
        const data = await response.clone().json();
        const playability = data?.playabilityStatus;
        if (playability?.status) {
          statuses.push({ status: String(playability.status), reason: playability.reason ? String(playability.reason) : undefined });
        }
      } else if (url.includes('youtube.com/watch')) {
        const body = await response.clone().text();
        const match = body.match(/"playabilityStatus":\{"status":"([A-Z_]+)"(?:,"reason":"([^"]*)")?/);
        if (match) statuses.push({ status: match[1], reason: match[2] });
      }
    } catch {
      // Diagnostics only; never break the actual fetch.
    }
    return response;
  };
}

function mapLibraryError(error: unknown, statuses: PlayabilityStatus[]): YouTubeTranscriptErrorCode {
  if (error instanceof YoutubeTranscriptDisabledError) {
    // Only trust "disabled" when YouTube actually served the video normally.
    const blocked = statuses.length > 0 && statuses.every((entry) => entry.status !== 'OK');
    return blocked ? 'YOUTUBE_REQUEST_BLOCKED' : 'YOUTUBE_TRANSCRIPT_DISABLED';
  }
  if (error instanceof YoutubeTranscriptNotAvailableError) return 'YOUTUBE_TRANSCRIPT_EMPTY';
  if (error instanceof YoutubeTranscriptVideoUnavailableError) return 'YOUTUBE_VIDEO_UNAVAILABLE';
  if (error instanceof YoutubeTranscriptTooManyRequestError) return 'YOUTUBE_RATE_LIMITED';
  return 'YOUTUBE_TRANSCRIPT_FETCH_FAILED';
}

export async function fetchYouTubeTranscriptCues(videoUrl: string): Promise<ITranscriptCue[]> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error('INVALID_YOUTUBE_URL');
  }

  const baseFetch = getBaseFetch();
  let rawCues: RawCue[];
  const statuses: PlayabilityStatus[] = [];
  try {
    rawCues = await YoutubeTranscript.fetchTranscript(videoId, { fetch: createObservingFetch(baseFetch, statuses) });
  } catch (error) {
    console.error(
      'YouTube transcript fetch error:',
      error instanceof Error ? error.message : error,
      statuses.length ? { playabilityStatus: statuses } : '',
    );
    throw new Error(mapLibraryError(error, statuses));
  }

  if (!Array.isArray(rawCues) || !rawCues.length) {
    throw new Error('YOUTUBE_TRANSCRIPT_EMPTY');
  }

  const divisor = usesMilliseconds(rawCues) ? 1000 : 1;
  const cues: ITranscriptCue[] = rawCues
    .map((item) => {
      const offset = Number(item.offset) / divisor;
      const duration = Number(item.duration || 0) / divisor;
      const startSeconds = Math.floor(offset);
      const endSeconds = duration > 0 ? Math.ceil(offset + duration) : undefined;
      const text = decodeHtmlEntities(item.text);
      return { startSeconds, ...(endSeconds && endSeconds > startSeconds ? { endSeconds } : {}), text };
    })
    .filter((cue) => Boolean(cue.text));

  if (!cues.length) {
    throw new Error('YOUTUBE_TRANSCRIPT_EMPTY');
  }

  cues.sort((left, right) => left.startSeconds - right.startSeconds);
  return cues.slice(0, 2_000);
}
