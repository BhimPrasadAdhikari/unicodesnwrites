import type { CSSProperties } from 'react';

import { SpotIllustration } from './SpotIllustration';

/** Newsletter hero: a friendly letter coming out of its envelope. The red pen underlines the subject and ticks it as sent. */
export function NewsletterLetter({ className }: { className?: string }) {
  return (
    <SpotIllustration viewBox="0 0 300 200" className={className}>
      {/* a letter coming out of its envelope */}
      <path className="solid" d="M78 120 L82 18 L222 24 L220 120 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M78 120 L82 18 L222 24 L220 120"/>
      <text className="fade" x="96" y="42" fontSize="13" fontStyle="italic">Hi there,</text>
      <path className="hlf fade" style={{ "--d": ".45s" } as CSSProperties} d="M136 50 L206 52 L206 59 L136 57 Z"/>
      <path className="pen-draw thin" pathLength={1} d="M138 56 C 160 54, 184 56, 206 57 M138 70 C 160 68, 184 70, 206 71 M98 88 C 140 86, 170 89, 206 90 M98 100 C 130 98, 160 100, 186 101"/>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".6s", "--t": ".3s" } as CSSProperties} d="M136 64 C 160 61, 186 65, 208 62"/>
      <path className="solid" d="M50 110 L250 110 L250 190 L50 190 Z"/>
      <path className="pen-draw ink" pathLength={1} d="M50 110 L250 110 L250 190 L50 190 Z M50 110 L150 160 L250 110 M50 190 L130 150 M250 190 L170 150"/>
      <path className="pen-draw thin" pathLength={1} d="M206 160 H236 V184 H206 Z"/>
      <text className="mono fade" x="210" y="175" fontSize="6">STAMP</text>
      <path className="pen-draw pen" pathLength={1} style={{ "--d": ".9s", "--t": ".3s" } as CSSProperties} d="M262 128 L270 137 L284 116"/>
    </SpotIllustration>
  );
}
