import type { CSSProperties } from 'react';

import { SpotIllustration } from './SpotIllustration';

/** Courses hero: a staircase of lessons with a flag at the top. The red pen ticks the steps already done. */
export function CoursesStairs({ className }: { className?: string }) {
  return (
    <SpotIllustration viewBox="0 0 360 250" className={className}>
      {/* a staircase of course parts */}
      <path className="pen-draw ink" pathLength={1} d="M14 222 C 140 219, 240 223, 346 220"/>
      <path className="pen-draw ink" pathLength={1} d="M40 220 L40 170 L130 170 L130 120 L220 120 L220 70 L310 70 L310 220"/>
      <path className="pen-draw thin" pathLength={1} d="M130 170 L130 220 M220 120 L220 220"/>
      <text className="mono fade" x="50" y="188" fontSize="8">01</text>
      <text x="50" y="206" fontSize="13">Basics</text>
      <text className="mono fade" x="140" y="138" fontSize="8">05</text>
      <text x="140" y="156" fontSize="13">Practice</text>
      <text className="mono fade" x="230" y="88" fontSize="8">10</text>
      <text x="230" y="106" fontSize="13">Project</text>
      <g transform="translate(246,120) scale(0.95)"><path className="pen-draw ink" pathLength={1} d="M8 10h32v23H8z"/><path className="pen-draw ink" pathLength={1} d="M24 33v5.5M17.5 38.5h13"/><path className="pen-draw pen" pathLength={1} d="M21 17v9.5l7.5-4.75z"/></g>
      {/* flag on the top step */}
      <path className="pen-draw ink" pathLength={1} d="M296 70 L296 30"/>
      <path className="hlf fade" style={{ "--d": ".5s" } as CSSProperties} d="M296 31 L322 38 L296 46 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M296 31 L322 38 L296 46"/>
      {/* finished steps get ticked */}
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".6s", "--t": ".25s" } as CSSProperties} d="M104 150 L112 159 L124 140"/>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".8s", "--t": ".25s" } as CSSProperties} d="M194 100 L202 109 L214 90"/>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": "1s", "--t": ".2s" } as CSSProperties} d="M126 162 C 150 150, 180 132, 214 124"/>
    </SpotIllustration>
  );
}
