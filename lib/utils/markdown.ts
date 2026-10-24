/**
 * Normalises line endings in content for consistent Markdown parsing.
 *
 * Previous versions injected `&nbsp;` HTML entities between paragraphs to
 * simulate extra spacing.  That broke the Markdown AST parser:
 *  - ReactMarkdown (without rehype-raw) would render the literal string
 *    "&amp;nbsp;" instead of whitespace.
 *  - With rehype-raw the entity was rendered, but it inserted a phantom node
 *    between list items, splitting every ordered / unordered list into
 *    separate single-item lists.
 *
 * The correct fix is to leave the raw Markdown untouched and let the prose
 * CSS (via @tailwindcss/typography) handle visual paragraph spacing.
 */
export function preserveSpacing(content: string | undefined | null): string {
  if (!content) return '';
  // Normalise Windows (CRLF) and classic Mac (CR) line endings to LF only.
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
