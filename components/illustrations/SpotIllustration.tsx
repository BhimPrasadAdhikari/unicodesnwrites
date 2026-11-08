'use client';

import { useRef, type ReactNode } from 'react';

import { usePenInView } from '@/components/motion/usePenInView';
import { cn } from '@/lib/utils';

interface SpotIllustrationProps {
  viewBox: string;
  className?: string;
  children: ReactNode;
}

/**
 * A hand-drawn spot illustration that inks itself in when it scrolls into view:
 * ink strokes first (staggered), then the red pen's marks (their own --d delays).
 * Colours come from the theme tokens (see `.spot` in globals.css), so night mode works.
 */
export function SpotIllustration({ viewBox, className, children }: SpotIllustrationProps) {
  const ref = useRef<SVGSVGElement>(null);
  const state = usePenInView(ref, { stagger: true });
  return (
    <svg ref={ref} viewBox={viewBox} data-pen={state} className={cn('spot', className)} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}
