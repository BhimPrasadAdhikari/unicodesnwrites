'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ReviewQueueDTO, ReviewStreakDTO } from '@/lib/services/review-queue';

type ReviewResult = {
  correct: boolean;
  correctOption: number;
  explanation: string;
  nextDueAt: string;
  streak: ReviewStreakDTO | null;
};

const browserTimeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

const formatDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function nextReviewLabel(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 1) return 'tomorrow';
  return `in ${days} days, on ${formatDay(iso)}`;
}

export function ReviewQueue() {
  const [queue, setQueue] = useState<ReviewQueueDTO | null>(null);
  const [loadError, setLoadError] = useState('');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [session, setSession] = useState({ reviewed: 0, correct: 0 });
  const [announcement, setAnnouncement] = useState('');
  const promptRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const focusPrompt = useRef(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const response = await fetch(`/api/review?tz=${encodeURIComponent(browserTimeZone())}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load your review queue.');
      setQueue(data);
      setIndex(0);
      setSelected(null);
      setResult(null);
      setAnswerError('');
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'Unable to load your review queue.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const card = queue?.cards[index] || null;

  // Keyboard and screen reader users land on the new question instead of the top of the page.
  useEffect(() => {
    if (queue && focusPrompt.current) {
      focusPrompt.current = false;
      promptRef.current?.focus();
    }
  }, [queue, index]);

  useEffect(() => {
    if (result || answerError) resultRef.current?.focus();
  }, [result, answerError]);

  const answer = async (optionIndex: number) => {
    if (!card || result || submitting) return;
    setSelected(optionIndex); setSubmitting(true); setAnswerError('');
    try {
      const response = await fetch(`/api/review/${encodeURIComponent(card.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOption: optionIndex, timeZone: browserTimeZone() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to check this answer.');
      setResult(data);
      setSession((current) => ({ reviewed: current.reviewed + 1, correct: current.correct + (data.correct ? 1 : 0) }));
      if (data.streak) setQueue((current) => current && { ...current, streak: data.streak });
      setAnnouncement(data.correct
        ? `Correct. Next review ${nextReviewLabel(data.nextDueAt)}.`
        : `Not quite. The right answer is: ${card.options[data.correctOption]}. This card comes back tomorrow.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to check this answer.';
      setAnswerError(message);
      setAnnouncement(message);
      setSelected(null);
    } finally { setSubmitting(false); }
  };

  const next = () => {
    setSelected(null); setResult(null); setAnswerError(''); setAnnouncement('');
    focusPrompt.current = true;
    if (queue && index + 1 < queue.cards.length) {
      setIndex(index + 1);
    } else {
      // End of this batch: fetch again, which either continues with more due cards or shows the empty state.
      setQueue(null);
      void load();
    }
  };

  const streak = queue?.streak;
  const total = queue?.dueCount || 0;

  return <div className="mx-auto max-w-[760px]">
    <p aria-live="polite" role="status" className="sr-only">{announcement}</p>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
      <span>{card ? `${index + 1} of ${total} due` : queue ? 'Nothing due' : 'Loading queue…'}</span>
      {streak && <span>
        <span className="text-foreground">{streak.current}-day streak</span>
        {streak.longest > streak.current && <> · best {streak.longest}</>}
        {!streak.reviewedToday && streak.current > 0 && <> · review today to keep it</>}
      </span>}
    </div>

    {loadError && <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
      {loadError}
      <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => void load()}>Try again</Button>
    </div>}

    {card ? <article className="mt-8" aria-labelledby="review-prompt">
      <p className="text-eyebrow text-primary">{card.course.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">From {card.lesson.title}{card.lapses ? ` · missed ${card.lapses} time${card.lapses === 1 ? '' : 's'} in review` : ''}</p>
      <h2 id="review-prompt" ref={promptRef} tabIndex={-1} className="mt-4 font-serif text-[26px] font-medium leading-snug outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">{card.prompt}</h2>

      <div role="group" aria-labelledby="review-prompt" className="mt-6 space-y-2">
        {card.options.map((option, optionIndex) => {
          const isRight = result && optionIndex === result.correctOption;
          const isWrongPick = result && !result.correct && optionIndex === selected;
          return <button
            key={optionIndex}
            type="button"
            onClick={() => void answer(optionIndex)}
            disabled={submitting || Boolean(result)}
            className={cn(
              'flex min-h-12 w-full items-start gap-3 rounded-xl border p-4 text-left text-[15px] leading-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default',
              isRight ? 'border-success bg-success/10'
                : isWrongPick ? 'border-primary bg-primary/5'
                  : selected === optionIndex ? 'border-foreground bg-secondary'
                    : 'border-border hover:bg-muted disabled:hover:bg-transparent',
            )}
          >
            <span aria-hidden="true" className="mt-0.5 font-mono text-[12px] text-muted-foreground">{String.fromCharCode(65 + optionIndex)}</span>
            <span className={cn('flex-1', isWrongPick && 'line-through decoration-primary decoration-2')}>{option}</span>
            {isRight && <><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span className="sr-only">(correct answer)</span></>}
            {isWrongPick && <><X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="sr-only">(your answer)</span></>}
          </button>;
        })}
      </div>

      {(result || answerError) && <div ref={resultRef} tabIndex={-1} className="mt-6 rounded-xl border border-border bg-card p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {result ? <>
          <p className="font-serif text-[22px] font-medium">{result.correct ? 'Correct.' : 'Not quite.'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.correct ? `Next review ${nextReviewLabel(result.nextDueAt)}.` : 'This card comes back tomorrow.'}
          </p>
          <p className="mt-4 text-[15px] leading-[1.6]">{result.explanation}</p>
          <p className="pen-note mt-4 text-base"><Link href={card.lessonUrl} className="underline underline-offset-4">Revisit {card.lesson.title} →</Link></p>
        </> : <p role="alert" className="text-sm text-destructive">{answerError}</p>}
        <Button type="button" className="mt-5" onClick={next}>{index + 1 < (queue?.cards.length || 0) ? 'Next card' : 'Finish'}</Button>
      </div>}
    </article> : queue && !loadError ? <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <span aria-hidden="true" className="font-serif text-5xl text-muted-foreground">✓</span>
      <h2 ref={promptRef} tabIndex={-1} className="mt-4 font-serif text-[28px] font-medium outline-none">
        {queue.nextDueAt ? `Nothing due — next card due on ${formatDay(queue.nextDueAt)}.` : 'Nothing due.'}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
        {session.reviewed
          ? `You reviewed ${session.reviewed} card${session.reviewed === 1 ? '' : 's'} and got ${session.correct} right. Come back tomorrow to keep the streak going.`
          : 'Questions you miss in a lesson quiz land here, then come back on a spaced schedule until they stick.'}
      </p>
      <Button asChild variant="outline" className="mt-6"><Link href="/learn">Continue learning</Link></Button>
    </div> : null}
  </div>;
}
