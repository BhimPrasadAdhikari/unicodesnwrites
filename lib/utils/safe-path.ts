/**
 * Returns `value` only when it is a same-site path such as `/courses/x?y=1`.
 * Rejects protocol-relative URLs, backslashes and control characters: browsers
 * strip tabs and newlines, so `/\t/evil.com` would otherwise become `//evil.com`.
 */
export function safeInternalPath<T extends string | null>(value: string | null | undefined, fallback: T): string | T {
  if (!value || value.length > 512) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
