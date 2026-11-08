import type { CSSProperties } from 'react';

import { SpotIllustration } from './SpotIllustration';

/** Account pages: the u mark being written on a sheet by the red pen, with pinned Articles and Courses cards. */
export function AuthDesk({ className }: { className?: string }) {
  return (
    <SpotIllustration viewBox="0 0 360 210" className={className}>
      {/* the mark, being written on a sheet */}
      <path className="solid" d="M96 14 L264 20 L258 196 L90 190 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M96 14 L264 20 L258 196 L90 190 Z"/>
      <path className="pen-draw ink bold" pathLength={1} style={{ "--d": ".15s", "--t": ".55s" } as CSSProperties} d="M144 58 L144 108 C 144 142, 204 142, 204 108 L204 58"/>
      <path className="pen-draw ink bold" pathLength={1} style={{ "--d": ".65s", "--t": ".2s" } as CSSProperties} d="M204 108 L204 140"/>
      <circle className="drop penfill" style={{ "--d": ".8s" } as CSSProperties} cx="204" cy="156" r="5.5"/>
      <path className="pen-draw thin" pathLength={1} d="M112 172 C 150 170, 190 172, 236 173"/>
      {/* the red pen that wrote it */}
      <path className="pen-draw ink" pathLength={1} d="M222 160 L300 108 L307 118 L229 170 Z M222 160 L212 174 L229 170"/>
      <path className="penfill" d="M292 113 L300 108 L307 118 L299 123 Z"/>
      {/* pinned cards: articles and courses icons */}
      <path className="pen-draw ink" pathLength={1} d="M18 40 L64 36 L68 82 L22 86 Z"/>
      <g transform="translate(19,37) scale(0.95)"><path className="pen-draw ink" pathLength={1} d="M24 15.5c-4-3-9-3.6-14.5-2.6v22c5.5-1 10.5-.4 14.5 2.6 4-3 9-3.6 14.5-2.6v-22c-5.5-1-10.5-.4-14.5 2.6z"/><path className="pen-draw ink" pathLength={1} d="M24 15.5v22"/><path className="pen-draw ink" pathLength={1} d="M14.5 21.5h5"/><path className="pen-draw pen" pathLength={1} d="M28.5 21.5h5"/></g>
      <path className="pen-draw ink" pathLength={1} d="M296 30 L340 34 L337 80 L293 76 Z"/>
      <g transform="translate(294,31) scale(0.95)"><path className="pen-draw ink" pathLength={1} d="M8 10h32v23H8z"/><path className="pen-draw ink" pathLength={1} d="M24 33v5.5M17.5 38.5h13"/><path className="pen-draw pen" pathLength={1} d="M21 17v9.5l7.5-4.75z"/></g>
    </SpotIllustration>
  );
}
