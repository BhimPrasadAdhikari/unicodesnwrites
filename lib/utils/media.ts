/**
 * GIF and WebP files can be animated. The Next.js image optimizer re-encodes
 * them as a single still frame, so these URLs must be served unoptimized.
 */
export function isAnimatableImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split(/[?#]/)[0].toLowerCase();
  return path.endsWith('.gif') || path.endsWith('.webp');
}
