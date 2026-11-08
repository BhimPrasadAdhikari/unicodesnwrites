'use client';

import { useEffect, useState, type RefObject } from 'react';

export type PenState = 'idle' | 'play';

interface Options {
  /** Give undelayed ink strokes a short stagger so a drawing inks in order (capped at 0.45 s). */
  stagger?: boolean;
  threshold?: number;
}

/**
 * Red pen pass: returns "play" once the element scrolls into view (once only).
 * Put the result on the element as `data-pen`; the CSS in globals.css draws `.pen-draw`
 * strokes when it flips. With reduced motion the CSS shows every stroke already drawn.
 */
export function usePenInView(ref: RefObject<Element | null>, { stagger = false, threshold = 0.3 }: Options = {}): PenState {
  const [state, setState] = useState<PenState>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (stagger) {
      el.querySelectorAll<SVGElement>('.pen-draw:not(.pen)').forEach((path, index) => {
        if (!path.style.getPropertyValue('--d')) path.style.setProperty('--d', `${Math.min(index * 0.04, 0.45)}s`);
      });
    }

    // Two frames so the undrawn state is painted before the transition starts.
    let frame = 0;
    const play = () => {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setState('play'));
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      play();
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          play();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, stagger, threshold]);

  return state;
}
