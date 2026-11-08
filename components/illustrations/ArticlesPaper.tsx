import type { CSSProperties } from 'react';

import { SpotIllustration } from './SpotIllustration';

/** Articles hero: a page being read with a magnifier. The red pen strikes one line, circles the result in the figure and labels it. */
export function ArticlesPaper({ className }: { className?: string }) {
  return (
    <SpotIllustration viewBox="0 0 360 250" className={className}>
      {/* a paper, taken apart */}
      <path className="solid" d="M110 20 L262 26 L256 228 L104 222 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M110 20 L262 26 L256 228 L104 222 Z"/>
      <path className="hlf fade" style={{ "--d": ".45s" } as CSSProperties} d="M124 40 L242 43 L242 51 L124 48 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M126 46 C 170 44, 210 47, 240 48"/>
      <path className="pen-draw thin" pathLength={1} d="M126 60 C 160 58, 190 60, 214 61 M124 80 C 170 78, 210 81, 242 82 M124 92 C 170 90, 210 93, 242 94 M124 104 C 160 102, 190 104, 210 105"/>
      <path className="pen-draw thin" pathLength={1} d="M134 130 L132 178 L232 181"/>
      <path className="pen-draw ink" pathLength={1} d="M136 174 C 152 170, 162 152, 178 150 C 194 148, 202 136, 228 132"/>
      <path className="pen-draw thin" pathLength={1} d="M122 200 C 170 198, 210 201, 238 202 M122 212 C 160 210, 190 212, 220 213"/>
      <text className="mono fade" x="126" y="124" fontSize="7">FIG. 2</text>
      {/* red pen: strike the old line, circle the result */}
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".55s", "--t": ".3s" } as CSSProperties} d="M120 92 C 160 88, 205 95, 246 90"/>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".8s", "--t": ".35s" } as CSSProperties} d="M232 132 C 226 120, 200 122, 196 134 C 192 148, 214 152, 228 146 C 238 141, 238 130, 228 126"/>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": "1.05s", "--t": ".15s" } as CSSProperties} d="M238 136 C 252 132, 262 128, 270 120"/>
      <text className="note fade" style={{ "--d": "1.1s" } as CSSProperties} x="272" y="118" fontSize="12">the result</text>
      {/* magnifier */}
      <path className="pen-draw ink" pathLength={1} d="M60 186 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0 M68 205 L46 230"/>
      <path className="pen-draw ink bold" pathLength={1} d="M60 212 L46 230"/>
    </SpotIllustration>
  );
}
