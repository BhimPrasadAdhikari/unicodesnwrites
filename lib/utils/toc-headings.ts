import GithubSlugger from 'github-slugger';

export interface TocHeading {
  id: string;
  text: string;
  level: number;
  line: number;
}

const INLINE_CODE_RE = /`([^`]+)`/g;
const IMAGE_LINK_RE = /!\[([^\]]*)\]\([^\)]*\)/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\([^\)]*\)/g;
const HTML_TAG_RE = /<[^>]+>/g;
const ESCAPED_MARKDOWN_RE = /\\([\\`*{}\[\]()#+\-.!_>])/g;

export const stripInlineMarkdown = (value: string) =>
  value
    .replace(INLINE_CODE_RE, '$1')
    .replace(IMAGE_LINK_RE, '$1')
    .replace(MARKDOWN_LINK_RE, '$1')
    .replace(HTML_TAG_RE, '')
    .replace(ESCAPED_MARKDOWN_RE, '$1')
    .replace(/[~*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function createSlugger() {
  return new GithubSlugger();
}

// Fallback shared slugger instance for backwards compatibility
const sharedSlugger = new GithubSlugger();

export function resetHeadingSlugger() {
  sharedSlugger.reset();
}

export function generateHeadingId(text: string): string {
  return sharedSlugger.slug(text);
}

export function extractMarkdownHeadings(markdown: string): TocHeading[] {
  if (!markdown) return [];

  const headings: TocHeading[] = [];
  const slugger = new GithubSlugger();
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const atxMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atxMatch) {
      const level = atxMatch[1].length;
      const text = stripInlineMarkdown(atxMatch[2]);
      if (text) {
        headings.push({
          level,
          text,
          id: slugger.slug(text),
          line: i + 1,
        });
      }
      continue;
    }

    const nextLine = lines[i + 1]?.trim();
    if (!trimmed || !nextLine) continue;

    if (/^=+\s*$/.test(nextLine) || /^-+\s*$/.test(nextLine)) {
      const level = /^=+\s*$/.test(nextLine) ? 1 : 2;
      const text = stripInlineMarkdown(trimmed);
      if (text) {
        headings.push({
          level,
          text,
          id: slugger.slug(text),
          line: i + 1,
        });
      }
      i += 1;
    }
  }

  return headings;
}
