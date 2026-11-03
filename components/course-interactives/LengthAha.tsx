"use client";

import { useState } from "react";

import { GOOD, Illustrative, LineChart, PEN, Slider } from "./primitives";

const POINTS = 60;
const AHA = 34;
// Illustrative shapes in the spirit of the DeepSeek-R1-Zero training plots.
const LENGTH = Array.from({ length: POINTS + 1 }, (_, i) => 0.08 + 0.75 * (i / POINTS) ** 1.6 + (i > AHA ? 0.06 : 0));
const ACCURACY = Array.from({ length: POINTS + 1 }, (_, i) => 0.15 + 0.6 * (1 - Math.exp(-i / 18)) + (i > AHA ? 0.05 : 0));

const SNAPSHOTS = [
  { until: 12, text: "<think>36 - 7 = 29</think><answer>29</answer>" },
  { until: 26, text: "<think>3 boxes of 12 is 36. She gives away 7. 36 - 7 = 29.</think><answer>29</answer>" },
  { until: AHA, text: "<think>3 × 12 = 36. 36 − 7 = 31… so 31.</think><answer>31</answer>" },
  {
    until: 46,
    text: "<think>3 × 12 = 36. 36 − 7 = 31. Wait, let me recheck that: 36 − 7 is 29, not 31. So 29.</think><answer>29</answer>",
  },
  {
    until: POINTS + 1,
    text: "<think>3 × 12 = 36 pencils. Giving away 7: 36 − 7 = 29. Check by adding back: 29 + 7 = 36 ✓. Answer 29.</think><answer>29</answer>",
  },
];

export default function LengthAha() {
  const [step, setStep] = useState(10);
  const snapshot = SNAPSHOTS.find((item) => step < item.until) ?? SNAPSHOTS[SNAPSHOTS.length - 1];

  return (
    <div className="space-y-5">
      <LineChart
        ariaLabel="Illustrative response length and accuracy rising over training, with the aha moment marked"
        series={[
          { label: "Average answer length", color: PEN, points: LENGTH },
          { label: "Accuracy", color: GOOD, points: ACCURACY },
        ]}
        xMax={POINTS}
        markers={[
          { x: AHA, label: "“aha”" },
          { x: step, label: "now" },
        ]}
        xLabel="training progress"
      />
      <Illustrative>Illustrative shape, inspired by the DeepSeek-R1 (2025) training plots, not real data</Illustrative>
      <Slider
        label="Scrub through training"
        value={step}
        min={0}
        max={POINTS}
        step={1}
        onChange={setStep}
        format={(v) => `${Math.round((v / POINTS) * 100)}%`}
      />
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-eyebrow text-muted-foreground">A typical answer at this point</p>
        <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-6">{snapshot.text}</p>
      </div>
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">
        Nobody told the model to double-check. It only ever got a point for a right final answer. Checking its own work simply
        earned more points, so the habit grew, and the answers got longer as it did.
      </p>
    </div>
  );
}
