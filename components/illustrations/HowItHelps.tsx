'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { usePenInView } from '@/components/motion/usePenInView';
import { cn } from '@/lib/utils';

const d = (delay: string, duration?: string) => ({ '--d': delay, ...(duration ? { '--t': duration } : {}) }) as CSSProperties;

function Slide({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = usePenInView(ref, { threshold: 0.1 });
  return (
    <div ref={ref} data-pen={state} className="grid min-h-[132px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      {children}
    </div>
  );
}

function QuizSlide() {
  return (
    <Slide>
      <div className="grid gap-2 text-[14px]">
        <p className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground">QUICK QUIZ · EXAMPLE</p>
        <p className="font-serif text-[18px] font-medium leading-snug">Answer now, or think first?</p>
        <span className="w-fit rounded-lg border border-border px-3 py-1.5">Answer now</span>
        <span className="relative w-fit rounded-lg border border-border px-3 py-1.5">
          Think first
          <svg aria-hidden="true" className="spot pointer-events-none absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)]" viewBox="0 0 120 50" preserveAspectRatio="none">
            <path className="pen-draw pen" pathLength={1} style={d('.3s', '.45s')} d="M112 12 C 120 36, 80 48, 40 46 C 6 44, 2 16, 30 6 C 60 -2, 104 2, 108 18" />
          </svg>
        </span>
      </div>
      <svg aria-hidden="true" className="spot w-12" viewBox="0 0 48 48">
        <path className="pen-draw pen" pathLength={1} style={d('.8s', '.25s')} d="M10 26 L20 36 L38 12" />
      </svg>
    </Slide>
  );
}

function ProgressSlide() {
  const nodes = [0, 1, 2, 3, 4, 5];
  return (
    <Slide>
      <div>
        <p className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground">YOUR PROGRESS · EXAMPLE</p>
        <p className="mt-2 font-serif text-[18px] font-medium leading-snug">Lesson 4 of 6, ready when you are.</p>
        <svg aria-hidden="true" className="spot mt-4 w-full max-w-[260px]" viewBox="0 0 260 24">
          <path className="thin" d="M10 12 H250" fill="none" />
          <path className="pen-draw ink" pathLength={1} style={{ ...d('.1s', '.6s'), strokeWidth: 3 }} d="M10 12 H166" />
          {nodes.map((n) => (
            <circle key={n} cx={10 + n * 48} cy={12} r={5} className={n <= 3 ? 'inkfill' : 'solid'} style={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.4 }} />
          ))}
          <circle className="drop penfill" style={d('.75s')} cx={166} cy={3} r={3} />
        </svg>
      </div>
    </Slide>
  );
}

function NotesSlide() {
  return (
    <Slide>
      <div className="max-w-[240px] rounded-xl border border-border px-3 py-2.5 font-serif text-[16px] leading-[1.5]">
        <p className="mb-1 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">YOUR NOTE · EXAMPLE</p>
        <span className="hl">Attention</span> lets each word look at the words around it.
      </div>
      {/* The Articles book icon (SiteIcon paths), drawn on; the red line being read comes last. */}
      <svg aria-hidden="true" className="spot w-12" viewBox="0 0 48 48">
        <path className="pen-draw ink" pathLength={1} style={d('.4s', '.45s')} d="M24 15.5c-4-3-9-3.6-14.5-2.6v22c5.5-1 10.5-.4 14.5 2.6 4-3 9-3.6 14.5-2.6v-22c-5.5-1-10.5-.4-14.5 2.6z" />
        <path className="pen-draw ink" pathLength={1} style={d('.6s', '.2s')} d="M24 15.5v22M14.5 21.5h5" />
        <path className="pen-draw pen" pathLength={1} style={d('.85s', '.2s')} d="M28.5 21.5h5" />
      </svg>
    </Slide>
  );
}

const SLIDES = [
  { caption: 'Quick quizzes check what you just learned.', render: () => <QuizSlide /> },
  { caption: 'Pick up right where you left off.', render: () => <ProgressSlide /> },
  { caption: 'Keep your own notes beside every lesson.', render: () => <NotesSlide /> },
];

/**
 * "How it helps": three small slides for the account pages. They change only when a dash is
 * clicked (no auto-advance, so nothing moves while someone types a password); each slide's red
 * pen plays once when it is shown.
 */
export function HowItHelps({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5', className)}>
      <p className="text-eyebrow text-primary">How it helps</p>
      <div className="mt-3" key={index}>{slide.render()}</div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.caption}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1} of ${SLIDES.length}`}
              aria-current={i === index ? 'true' : undefined}
              className="flex h-11 items-center"
            >
              <span className={cn('block h-1 rounded-full transition-all duration-200 motion-reduce:transition-none', i === index ? 'w-8 bg-foreground' : 'w-5 bg-border')} />
            </button>
          ))}
        </div>
        <p aria-live="polite" className="text-[14px] text-muted-foreground">{slide.caption}</p>
      </div>
    </div>
  );
}
