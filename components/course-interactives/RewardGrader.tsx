"use client";

import { useState } from "react";

import { ChipButton, Stat } from "./primitives";

const QUESTION = "Priya has 3 boxes of 12 pencils. She gives away 7 pencils. How many does she have left?";
const TRUE_ANSWER = 29;

const SAMPLES: Record<string, string> = {
  "Good answer": "<think>\n3 boxes × 12 pencils = 36 pencils.\nShe gives away 7, so 36 − 7 = 29.\n</think>\n<answer>29</answer>",
  "Wrong maths": "<think>\n3 × 12 = 36. Then 36 − 7 = 31.\n</think>\n<answer>31</answer>",
  "No format": "3 boxes of 12 is 36, minus 7 leaves 29. The answer is 29.",
  "Sneaky guess": "<think>\nNot sure.\n</think>\n<answer>27 28 29 30</answer>",
};

const FORMAT = /^<think>[\s\S]+?<\/think>\s*<answer>([\s\S]+?)<\/answer>\s*$/;

export function gradeCompletion(text: string) {
  const match = text.trim().match(FORMAT);
  const formatReward = match ? 1 : 0;
  const answer = match?.[1].trim() ?? "";
  // Strict: the answer must be exactly one number, so guessing several fails.
  const single = /^-?\d+(\.\d+)?$/.test(answer);
  const correctness = single && Number(answer) === TRUE_ANSWER ? 1 : 0;
  return { formatReward, correctness, answer, single };
}

export default function RewardGrader() {
  const [text, setText] = useState(SAMPLES["Good answer"]);
  const [weight, setWeight] = useState(0.2);
  const { formatReward, correctness, answer, single } = gradeCompletion(text);
  const total = correctness + weight * formatReward;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <p className="text-eyebrow text-muted-foreground">Question (true answer: {TRUE_ANSWER})</p>
        <p className="mt-1">{QUESTION}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(SAMPLES).map(([label, sample]) => (
          <ChipButton key={label} active={text === sample} onClick={() => setText(sample)}>
            {label}
          </ChipButton>
        ))}
      </div>
      <label className="block">
        <span className="text-sm font-semibold">The model&apos;s answer (edit it)</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          spellCheck={false}
          className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Format reward" value={String(formatReward)} tone={formatReward ? "good" : undefined} />
        <Stat label="Correctness reward" value={String(correctness)} tone={correctness ? "good" : undefined} />
        <Stat label="Total reward" value={total.toFixed(2)} tone="pen" />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span className="font-semibold">Weight of the format reward</span>
        <input type="range" min={0} max={1} step={0.1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="flex-1 accent-[hsl(var(--primary))]" />
        <span className="font-mono text-primary">{weight.toFixed(1)}</span>
      </label>
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">
        {!formatReward
          ? "No reward for format: the grader can't find a <think>…</think> block followed by an <answer>…</answer> block, so it can't even read an answer."
          : !single
            ? `The answer block holds “${answer}”, which isn't a single number. A lazy grader that checked “does 29 appear?” would pay out here: that is reward hacking.`
            : correctness
              ? "Both checks pass. No human looked at this: two short rules did the grading. That is a verifiable reward."
              : `Well formatted, but ${answer} isn't ${TRUE_ANSWER}. Good format alone earns only the small format bonus.`}
      </p>
    </div>
  );
}
