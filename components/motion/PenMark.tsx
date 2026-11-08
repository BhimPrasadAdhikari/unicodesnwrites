'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { usePenInView } from './usePenInView';

interface PenMarkProps {
  children: ReactNode;
  /** underline: a slightly wobbly line under the words; circle: a loop drawn round them */
  kind?: 'underline' | 'circle';
  /** Seconds before the pen starts, once the words are in view */
  delay?: number;
  /** Seconds the stroke takes to draw */
  duration?: number;
  className?: string;
}

function markPath(kind: 'underline' | 'circle', w: number, h: number) {
  if (kind === 'circle') {
    return `M ${w + 4} ${h * 0.15} C ${w + 12} ${h * 0.9}, ${w * 0.6} ${h + 7}, ${w * 0.25} ${h + 5} C ${-10} ${h + 2}, ${-12} ${-2}, ${w * 0.3} ${-6} C ${w * 0.7} ${-9}, ${w + 10} ${-2}, ${w + 2} ${h * 0.35}`;
  }
  const y = h * 0.95;
  return `M -2 ${y} C ${w * 0.3} ${y - h * 0.05}, ${w * 0.62} ${y + h * 0.05}, ${w + 3} ${y - h * 0.02}`;
}

/**
 * The red pen marks a few words when they scroll into view. The words stay real text;
 * the mark is an aria-hidden SVG drawn over them, measured with a ResizeObserver.
 */
export function PenMark({ children, kind = 'underline', delay = 0.5, duration = 0.4, className }: PenMarkProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const state = usePenInView(ref);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const strokeWidth = size ? Math.max(2, Math.min(5, size.h * 0.06)) : 2;
  const style = { strokeWidth, '--d': `${delay}s`, '--t': `${duration}s` } as CSSProperties;

  return (
    <span ref={ref} data-pen={state} className={cn('relative inline-block whitespace-nowrap', className)}>
      {children}
      {size ? (
        <svg
          aria-hidden="true"
          focusable="false"
          width={size.w}
          height={size.h}
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
        >
          <path className="pen-draw pen-mark" pathLength={1} d={markPath(kind, size.w, size.h)} style={style} />
        </svg>
      ) : null}
    </span>
  );
}
