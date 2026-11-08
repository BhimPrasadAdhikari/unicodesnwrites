import type { CSSProperties } from 'react';

import { SpotIllustration } from './SpotIllustration';

/** Projects empty state: an open box with building blocks inside and a tag that says "soon". */
export function ProjectsBox({ className }: { className?: string }) {
  return (
    <SpotIllustration viewBox="0 0 300 190" className={className}>
      {/* a box of things being built */}
      <path className="pen-draw ink" pathLength={1} d="M70 172 C 130 170, 190 173, 250 171"/>
      <path className="pen-draw ink" pathLength={1} d="M90 90 L210 90 L210 170 L90 170 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M90 90 L66 66 M210 90 L234 66 M90 90 L120 72 L180 72 L210 90"/>
      <g transform="translate(128,98) scale(1)"><path className="pen-draw ink" pathLength={1} d="M8.5 27h14v11h-14z"/><path className="pen-draw ink" pathLength={1} d="M25.5 27h14v11h-14z"/><path className="pen-draw ink" pathLength={1} d="M17 13h14v11H17z"/><path className="pen-draw pen" pathLength={1} d="M21.5 9.5h5"/></g>
      <text className="mono fade" x="104" y="162" fontSize="7">PROJECTS</text>
      <path className="pen-draw thin" pathLength={1} d="M140 72 L146 40 M160 72 L170 34 M152 60 C 150 50, 158 46, 156 36"/>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".6s", "--t": ".3s" } as CSSProperties} d="M210 110 C 230 110, 238 104, 246 96"/>
      <path className="pen-draw ink" pathLength={1} d="M244 86 L272 82 L274 102 L246 106 Z"/>
      <text className="note fade" style={{ "--d": ".85s" } as CSSProperties} x="249" y="99" fontSize="11">soon</text>
    </SpotIllustration>
  );
}
