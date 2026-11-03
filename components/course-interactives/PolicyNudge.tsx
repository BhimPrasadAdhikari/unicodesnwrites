"use client";

import { useState } from "react";

import { softmax } from "@/lib/courses/tiny-adder";
import { Bars, ChipButton, Slider } from "./primitives";

const OPTIONS = ["12", "13", "11", "75"];
const START = [0.3, 0.6, 0.2, 0.4];

export default function PolicyNudge() {
  const [logits, setLogits] = useState(START);
  const [lr, setLr] = useState(0.5);
  const [history, setHistory] = useState<string[]>([]);
  const probs = softmax(logits);

  const nudge = (index: number, score: number) => {
    // REINFORCE: logits move by lr × score × (one-hot − probabilities)
    setLogits((current) => {
      const p = softmax(current);
      return current.map((value, k) => value + lr * score * ((k === index ? 1 : 0) - p[k]));
    });
    setHistory((items) => [`${score > 0 ? "Rewarded" : "Penalized"} “${OPTIONS[index]}”`, ...items].slice(0, 4));
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6">
        The model is asked <strong>&ldquo;7 + 5 = ?&rdquo;</strong> and these are its chances of saying each answer. Reward or penalize an answer and watch every bar move.
      </p>
      <Bars values={probs} labels={OPTIONS} highlight={[0]} max={1} format={(v) => `${Math.round(v * 100)}%`} ariaLabel="Probability of each answer" />
      <div className="grid gap-2 sm:grid-cols-4">
        {OPTIONS.map((option, i) => (
          <div key={option} className="flex gap-1">
            <button type="button" onClick={() => nudge(i, 1)} className="min-h-10 flex-1 rounded-lg bg-foreground px-2 text-sm font-semibold text-background">
              +1 “{option}”
            </button>
            <button type="button" onClick={() => nudge(i, -1)} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold" aria-label={`Penalize ${option}`}>
              −1
            </button>
          </div>
        ))}
      </div>
      <Slider label="Step size (learning rate)" value={lr} min={0.05} max={3} step={0.05} onChange={setLr} format={(v) => v.toFixed(2)} hint="Big steps learn fast but can overshoot. Try 3 and reward a wrong answer once." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{history.length ? history.join(" · ") : "Nothing yet. Try rewarding “12” a few times."}</p>
        <ChipButton onClick={() => { setLogits(START); setHistory([]); }}>Reset</ChipButton>
      </div>
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">
        The chances always add up to 100%, so making one answer more likely makes the others less likely. The model never sees the right answer, only a score.
      </p>
    </div>
  );
}
