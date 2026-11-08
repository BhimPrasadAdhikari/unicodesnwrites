import type { CSSProperties } from 'react';

import { SpotIllustration } from './SpotIllustration';

/** Home hero: a reading desk. A notebook shows a photo cut into squares ("cat → ?"); the red pen circles the question and writes "how?". */
export function HomeDesk({ className }: { className?: string }) {
  return (
    <SpotIllustration viewBox="0 0 360 250" className={className}>
      {/* pinned card: the articles icon */}
      <path className="pen-draw ink" pathLength={1} d="M34 24 L98 20 L101 78 L37 82 Z"/>
      <circle className="inkfill" cx="66" cy="22" r="3"/>
      <text className="mono fade" x="42" y="36" fontSize="7">ARTICLES</text>
      <g transform="translate(44,34) scale(0.95)"><path className="pen-draw ink" pathLength={1} d="M24 15.5c-4-3-9-3.6-14.5-2.6v22c5.5-1 10.5-.4 14.5 2.6 4-3 9-3.6 14.5-2.6v-22c-5.5-1-10.5-.4-14.5 2.6z"/><path className="pen-draw ink" pathLength={1} d="M24 15.5v22"/><path className="pen-draw ink" pathLength={1} d="M14.5 21.5h5"/><path className="pen-draw pen" pathLength={1} d="M28.5 21.5h5"/></g>
      {/* desk */}
      <path className="pen-draw ink" pathLength={1} d="M14 214 C 120 211, 240 216, 346 212"/>
      <path className="pen-draw ink" pathLength={1} d="M42 214 L38 242 M318 213 L323 242"/>
      {/* open notebook */}
      <path className="pen-draw ink" pathLength={1} d="M70 190 L92 96 C 120 90, 150 92, 178 102 L178 196 C 150 186, 110 184, 70 190 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M178 102 C 206 92, 236 90, 264 96 L286 190 C 246 184, 206 186, 178 196 Z"/>
      <path className="hlf fade" style={{ "--d": ".5s" } as CSSProperties} d="M92 127 L166 128 L166 136 L90 135 Z"/>
      <path className="pen-draw thin" pathLength={1} d="M96 118 C 118 115, 142 116, 166 119 M93 132 C 118 129, 142 130, 166 133 M90 146 C 114 143, 138 145, 166 147 M87 160 C 110 157, 134 159, 166 161 M84 174 C 104 172, 124 172, 142 174"/>
      <text x="190" y="124" fontSize="14">cat → ?</text>
      <path className="pen-draw thin" pathLength={1} d="M196 140 H244 V188 H196 Z M212 140 V188 M228 140 V188 M196 156 H244 M196 172 H244"/>
      <rect className="hlf fade" style={{ "--d": ".5s" } as CSSProperties} x="213" y="157" width="14" height="14"/>
      {/* the red pen's annotation */}
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".6s", "--t": ".4s" } as CSSProperties} d="M246 112 C 238 104, 222 106, 220 116 C 218 128, 234 132, 244 125 C 250 120, 248 111, 240 108"/>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".95s", "--t": ".2s" } as CSSProperties} d="M250 112 C 260 104, 270 101, 282 100"/>
      <text className="note fade" style={{ "--d": "1s" } as CSSProperties} x="286" y="104" fontSize="12">how?</text>
      {/* pen on the desk */}
      <path className="pen-draw ink" pathLength={1} d="M118 205 L194 199 L195 207 L119 213 Z M118 205 L108 209 L119 213"/>
      <path className="penfill" d="M184 200 L194 199 L195 207 L185 208 Z"/>
      {/* mug */}
      <path className="pen-draw ink" pathLength={1} d="M298 210 L300 166 L330 166 L332 210 Z M331 176 C 345 176, 345 198, 331 198"/>
      <path className="pen-draw thin" pathLength={1} d="M306 160 C 304 152, 310 148, 308 140 M318 160 C 316 152, 322 148, 320 140"/>
    </SpotIllustration>
  );
}
