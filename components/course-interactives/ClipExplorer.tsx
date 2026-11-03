"use client";

import { useState } from "react";

import { ChipButton, LineChart, MUTED, PEN, Slider } from "./primitives";

const RATIOS = Array.from({ length: 101 }, (_, i) => 0.5 + i * 0.01);

export default function ClipExplorer() {
  const [ratio, setRatio] = useState(1.1);
  const [eps, setEps] = useState(0.2);
  const [sign, setSign] = useState<1 | -1>(1);

  const objective = (r: number) => Math.min(r * sign, Math.min(Math.max(r, 1 - eps), 1 + eps) * sign);
  const clippedNow = (sign > 0 && ratio > 1 + eps) || (sign < 0 && ratio < 1 - eps);
  const unclipped = RATIOS.map((r) => r * sign);
  const clipped = RATIOS.map(objective);
  const marker = Math.round((ratio - 0.5) / 0.01);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6">
        The <strong>ratio</strong> compares how likely an answer is now with how likely it was before this update. 1.0 means no change. Clipping caps how far one update can move it.
      </p>
      <div className="flex flex-wrap gap-2">
        <ChipButton active={sign === 1} onClick={() => setSign(1)}>Good answer (advantage +1)</ChipButton>
        <ChipButton active={sign === -1} onClick={() => setSign(-1)}>Bad answer (advantage −1)</ChipButton>
      </div>
      <LineChart
        ariaLabel="Clipped and unclipped objective against the probability ratio"
        series={[
          { label: "Without clipping", color: MUTED, points: unclipped, dashed: true },
          { label: "With clipping (what GRPO uses)", color: PEN, points: clipped },
        ]}
        yMin={sign > 0 ? 0.4 : -1.6}
        yMax={sign > 0 ? 1.6 : -0.4}
        xMax={100}
        markers={[{ x: marker, label: `ratio ${ratio.toFixed(2)}` }]}
        xLabel="ratio: new probability ÷ old probability (0.5 → 1.5)"
        yLabel="objective"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Ratio for this answer" value={ratio} min={0.5} max={1.5} step={0.01} onChange={setRatio} format={(v) => v.toFixed(2)} />
        <Slider label="Clip range ε" value={eps} min={0.05} max={0.4} step={0.01} onChange={setEps} format={(v) => `±${v.toFixed(2)}`} />
      </div>
      <p className={`rounded-lg border p-3 text-sm leading-6 ${clippedNow ? "border-primary/40 bg-primary/5" : "border-border bg-muted/40"}`}>
        {clippedNow
          ? `Clipped. This answer has already moved more than ${Math.round(eps * 100)}% in the helpful direction, so the line goes flat and the push stops for this round. That keeps one lucky batch from yanking the model too far.`
          : sign > 0
            ? "Still inside the range: the model keeps making this good answer more likely."
            : "Still inside the range: the model keeps making this bad answer less likely."}
      </p>
    </div>
  );
}
