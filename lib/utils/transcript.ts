import type { ITranscriptCue } from '@/lib/models/Course';

const TIMESTAMP = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/;

function timestampToSeconds(value: string) {
  const match = value.trim().match(new RegExp(`^${TIMESTAMP.source}$`));
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function compactText(lines: string[]) {
  return lines
    .map((line) => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTranscriptText(raw: string) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const cues: ITranscriptCue[] = [];
  let skippedBlocks = 0;

  if (text.includes('-->')) {
    for (const block of text.split(/\n{2,}/)) {
      const lines = block.split('\n').map((line) => line.trim());
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex < 0) continue;
      const [rawStart, rawEnd] = lines[timingIndex].split('-->').map((part) => part.trim().split(/\s+/)[0]);
      const startSeconds = timestampToSeconds(rawStart);
      const endSeconds = timestampToSeconds(rawEnd);
      const cueText = compactText(lines.slice(timingIndex + 1));
      if (startSeconds === null || !cueText || (endSeconds !== null && endSeconds <= startSeconds)) {
        skippedBlocks += 1;
        continue;
      }
      cues.push({
        startSeconds,
        ...(endSeconds !== null ? { endSeconds } : {}),
        text: cueText,
      });
    }
  } else {
    // Accepts "0:00 | text", "0:00 text", and YouTube's "Show transcript"
    // panel copy, where the timestamp sits on its own line above the text.
    let pending: { startSeconds: number; lines: string[] } | null = null;
    const flushPending = () => {
      if (!pending) return;
      const cueText = compactText(pending.lines);
      if (cueText) cues.push({ startSeconds: pending.startSeconds, text: cueText });
      else skippedBlocks += 1;
      pending = null;
    };

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const standalone = timestampToSeconds(trimmed);
      if (standalone !== null) {
        flushPending();
        pending = { startSeconds: standalone, lines: [] };
        continue;
      }

      const match = trimmed.match(/^((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s*[|\-–]\s*|\s+)(.+)$/);
      const inlineStart = match ? timestampToSeconds(match[1]) : null;
      if (match && inlineStart !== null) {
        flushPending();
        const cueText = compactText([match[2]]);
        if (cueText) cues.push({ startSeconds: inlineStart, text: cueText });
        else skippedBlocks += 1;
        continue;
      }

      // Screen-reader durations the panel sometimes includes, e.g. "1 minute, 5 seconds".
      if (/^(\d+\s+(hours?|minutes?|seconds?),?\s*)+$/i.test(trimmed)) continue;

      if (pending) pending.lines.push(trimmed);
      else skippedBlocks += 1;
    }
    flushPending();
  }

  cues.sort((left, right) => left.startSeconds - right.startSeconds);
  return { cues: cues.slice(0, 2_000), skippedBlocks };
}

export function formatTranscriptCues(cues: ITranscriptCue[]) {
  return cues
    .map((cue) => {
      const hours = Math.floor(cue.startSeconds / 3600);
      const minutes = Math.floor((cue.startSeconds % 3600) / 60);
      const seconds = cue.startSeconds % 60;
      const timestamp = hours
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${minutes}:${String(seconds).padStart(2, '0')}`;
      return `${timestamp} | ${cue.text}`;
    })
    .join('\n');
}
