"use client";

import { useState } from "react";

import { Illustrative, LineChart, PEN, Slider } from "./primitives";

const STEPS = [
  "Let the ball cost x rupees. Then the bat costs x + 100.",
  "Together: x + (x + 100) = 110.",
  "So 2x + 100 = 110, which means 2x = 10.",
  "x = 5. Check: ball ₹5, bat ₹105, total ₹110, and the bat costs ₹100 more. ✓",
];
const BUDGET_MAX = 2000;
const STEP_COST = 400; // illustrative tokens per reasoning step

// Illustrative saturating curve: more thinking helps, with diminishing returns.
const accuracyAt = (tokens: number) => 0.32 + 0.5 * (1 - Math.exp(-tokens / 550));
const CURVE = Array.from({ length: 41 }, (_, i) => accuracyAt((i / 40) * BUDGET_MAX));

export default function ThinkBudget() {
  const [budget, setBudget] = useState(0);
  const shown = Math.min(STEPS.length, Math.floor(budget / STEP_COST));
  const solved = shown === STEPS.length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <p className="text-eyebrow text-muted-foreground">Puzzle</p>
        <p className="mt-1">A bat and a ball cost ₹110 together. The bat costs ₹100 more than the ball. How much is the ball?</p>
      </div>
      <Slider
        label="Thinking allowed before answering"
        value={budget}
        min={0}
        max={BUDGET_MAX}
        step={50}
        onChange={setBudget}
        format={(v) => (v === 0 ? "none" : `${v} tokens`)}
      />
      <div className="rounded-lg border border-border bg-background p-4 font-mono text-sm leading-6">
        {shown === 0 ? (
          <p>
            <span className="text-muted-foreground">Answer:</span> ₹10 <span className="text-primary">✗ the quick, wrong guess</span>
          </p>
        ) : (
          <>
            <p className="text-muted-foreground">&lt;think&gt;</p>
            {STEPS.slice(0, shown).map((step) => (
              <p key={step} className="pl-4">
                {step}
              </p>
            ))}
            {!solved && <p className="pl-4 text-muted-foreground">… (ran out of thinking room)</p>}
            <p className="text-muted-foreground">&lt;/think&gt;</p>
            <p>
              <span className="text-muted-foreground">Answer:</span>{" "}
              {solved ? (
                <>
                  ₹5 <span className="text-success">✓</span>
                </>
              ) : (
                <>
                  ₹10 <span className="text-primary">✗</span>
                </>
              )}
            </p>
          </>
        )}
      </div>
      <div>
        <p className="text-eyebrow text-muted-foreground">Accuracy on hard questions vs thinking allowed</p>
        <LineChart
          ariaLabel="Illustrative accuracy rising with more thinking tokens, with diminishing returns"
          series={[{ label: "Accuracy (illustrative)", color: PEN, points: CURVE }]}
          markers={[{ x: (budget / BUDGET_MAX) * 40, label: "you" }]}
          xMax={40}
          xLabel={`thinking tokens (0 → ${BUDGET_MAX})`}
          height={190}
        />
        <Illustrative>Illustrative shape based on published test-time-compute results, not measured here</Illustrative>
      </div>
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">
        The model is the same in every case. Only the room to work things out changes. A reasoning model is one that has{" "}
        <em>learned to use</em> that room well, and that learning is what this course is about.
      </p>
    </div>
  );
}
