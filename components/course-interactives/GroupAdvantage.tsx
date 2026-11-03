"use client";

import { useState } from "react";

import { groupAdvantages } from "@/lib/courses/tiny-adder";
import { Bars, ChipButton, Stat } from "./primitives";

const ANSWERS = [
  "7 + 5 = 12",
  "7 + 5 = 13",
  "Seven plus five… 12",
  "12",
  "7 + 5 = 75",
  "It is 12.",
  "11",
  "7 + 5 is 12, because 7 + 3 = 10 and 2 more is 12",
];
const START = [1, 0, 1, 1, 0, 1, 0, 1];
const LEVELS = [0, 0.5, 1];

export default function GroupAdvantage() {
  const [rewards, setRewards] = useState<number[]>(START);
  const mean = rewards.reduce((sum, r) => sum + r, 0) / rewards.length;
  const std = Math.sqrt(rewards.reduce((sum, r) => sum + (r - mean) ** 2, 0) / rewards.length);
  const advantages = groupAdvantages(rewards);
  const flat = rewards.every((r) => r === rewards[0]);

  const cycle = (index: number) =>
    setRewards((current) => current.map((r, i) => (i === index ? LEVELS[(LEVELS.indexOf(r) + 1) % LEVELS.length] : r)));

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6">
        The model answered <strong>&ldquo;What is 7 + 5?&rdquo;</strong> eight times. Click an answer to change its reward (0 → ½ → 1).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ANSWERS.map((answer, i) => (
          <button
            key={answer}
            type="button"
            onClick={() => cycle(i)}
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/60"
          >
            <span className="font-mono">{answer}</span>
            <span className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs ${rewards[i] === 1 ? "bg-success/15 text-success" : rewards[i] === 0 ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning"}`}>
              reward {rewards[i]}
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Group average" value={mean.toFixed(2)} />
        <Stat label="Spread (std)" value={std.toFixed(2)} />
        <Stat label="Answers pushed up" value={String(advantages.filter((a) => a > 0.01).length)} tone="good" />
      </div>
      <div>
        <p className="text-eyebrow text-muted-foreground">Advantage = (reward − average) ÷ spread</p>
        <Bars
          values={advantages}
          labels={ANSWERS.map((_, i) => `#${i + 1}`)}
          signed
          max={Math.max(2.7, ...advantages.map(Math.abs))}
          highlight={advantages.map((a, i) => (a > 0.01 ? i : -1)).filter((i) => i >= 0)}
          ariaLabel="Advantage for each of the eight answers"
        />
      </div>
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">
        {flat
          ? "Every answer got the same reward, so every advantage is zero. GRPO learns nothing from this group: there is no better or worse answer to compare."
          : "Red bars are better than the group average, so the model makes them more likely. Grey bars below the line are worse than average and get pushed down. Nobody had to train a separate judge to say what 'average' means: the group is the baseline."}
      </p>
      <div className="flex flex-wrap gap-2">
        <ChipButton onClick={() => setRewards(START)}>Reset</ChipButton>
        <ChipButton onClick={() => setRewards(START.map(() => 1))}>All correct</ChipButton>
        <ChipButton onClick={() => setRewards(START.map((_, i) => (i === 7 ? 1 : 0)))}>Only one correct</ChipButton>
      </div>
    </div>
  );
}
