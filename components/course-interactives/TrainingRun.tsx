"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

import { ANSWERS, createTinyAdder, type TinyAdderConfig, type TinyAdderStep } from "@/lib/courses/tiny-adder";
import { Bars, ChipButton, GOOD, INK, LineChart, MUTED, PEN, Slider, Stat, Toggle } from "./primitives";

const TOTAL_STEPS = 200;
const MAX_ENTROPY = Math.log(ANSWERS);

const PRESETS: Record<string, { label: string; note: string; config: Partial<TinyAdderConfig> }> = {
  healthy: {
    label: "Healthy",
    note: "Reward and true accuracy climb together, and the model slowly becomes more certain. This is what you hope to see.",
    config: { G: 8, lr: 0.5, beta: 0, buggy: false },
  },
  stuck: {
    label: "Stuck",
    note: "Only two answers per question. Most groups are all wrong, so every advantage is zero and there is nothing to learn from. Watch the 'nothing to compare' line stay high.",
    config: { G: 2, lr: 0.5, beta: 0, buggy: false },
  },
  hacking: {
    label: "Reward hacking",
    note: "The reward function has a bug: it pays for any even number. Reward shoots up, but true accuracy stays at chance. The model learned exactly what you paid for, not what you meant.",
    config: { G: 8, lr: 0.5, beta: 0, buggy: true },
  },
  leash: {
    label: "Tight leash",
    note: "A strong pull back toward the starting model (β). Learning still happens, but slower, and the model stays less certain.",
    config: { G: 8, lr: 0.5, beta: 0.05, buggy: false },
  },
};

export default function TrainingRun() {
  const [config, setConfig] = useState<Partial<TinyAdderConfig>>(PRESETS.healthy.config);
  const [preset, setPreset] = useState<string | null>("healthy");
  const [history, setHistory] = useState<TinyAdderStep[]>([]);
  const [running, setRunning] = useState(false);
  const [probe, setProbe] = useState<number[]>(() => new Array(ANSWERS).fill(1 / ANSWERS));
  const runRef = useRef(createTinyAdder(config));
  const historyRef = useRef<TinyAdderStep[]>([]);
  const frame = useRef<number | null>(null);

  const reset = useCallback((next: Partial<TinyAdderConfig>) => {
    if (frame.current) cancelAnimationFrame(frame.current);
    runRef.current = createTinyAdder(next);
    historyRef.current = [];
    setHistory([]);
    setRunning(false);
    setProbe(runRef.current.answerDistribution(3, 4));
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const steps = historyRef.current;
      if (steps.length >= TOTAL_STEPS) {
        setRunning(false);
        return;
      }
      steps.push(runRef.current.step(), runRef.current.step());
      setHistory(steps.slice(0, TOTAL_STEPS));
      setProbe(runRef.current.answerDistribution(3, 4));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [running]);

  const update = (patch: Partial<TinyAdderConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    setPreset(null);
    reset(next);
  };

  const choosePreset = (key: string) => {
    setConfig(PRESETS[key].config);
    setPreset(key);
    reset(PRESETS[key].config);
  };

  const last = history[history.length - 1];
  const done = history.length >= TOTAL_STEPS;

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6">
        This is a real GRPO run, computed in your browser. A tiny model learns single-digit addition (&ldquo;Tiny Adder&rdquo;): for each question it tries a group of answers, scores them, and nudges itself toward the better-than-average ones.
      </p>

      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, item]) => (
          <ChipButton key={key} active={preset === key} onClick={() => choosePreset(key)}>
            {item.label}
          </ChipButton>
        ))}
      </div>
      {preset && <p className="text-sm leading-6 text-muted-foreground">{PRESETS[preset].note}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (done ? (reset(config), setRunning(true)) : setRunning((value) => !value))}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background"
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : done ? "Run again" : history.length ? "Resume" : "Start training"}
        </button>
        <button type="button" onClick={() => reset(config)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <span className="font-mono text-sm text-muted-foreground">
          step {history.length}/{TOTAL_STEPS}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <Stat label="Reward (what we pay for)" value={last ? last.meanReward.toFixed(2) : "–"} tone="pen" />
        <Stat label="True accuracy" value={last ? `${Math.round(last.accuracy * 100)}%` : "5%"} tone="good" />
        <Stat label="Uncertainty" value={last ? `${Math.round((last.entropy / MAX_ENTROPY) * 100)}%` : "100%"} />
        <Stat label="Nothing to compare" value={last ? `${Math.round(last.zeroVarianceGroups * 100)}%` : "–"} />
      </div>

      <LineChart
        ariaLabel="Reward and accuracy over training steps"
        xMax={TOTAL_STEPS}
        xLabel="training step"
        series={[
          { label: "Reward", color: PEN, points: history.map((h) => h.meanReward) },
          { label: "True accuracy", color: GOOD, points: history.map((h) => h.accuracy) },
          { label: "Uncertainty (entropy ÷ max)", color: INK, points: history.map((h) => h.entropy / MAX_ENTROPY), dashed: true },
          { label: "Groups with nothing to compare", color: MUTED, points: history.map((h) => h.zeroVarianceGroups), dashed: true },
        ]}
      />

      <div>
        <p className="text-eyebrow text-muted-foreground">What the model now says for 3 + 4 (right answer: 7)</p>
        <Bars
          values={probe}
          labels={Array.from({ length: ANSWERS }, (_, k) => String(k))}
          highlight={[7]}
          max={Math.max(0.2, ...probe)}
          height={150}
          ariaLabel="Probability of each answer to 3 plus 4"
        />
      </div>

      <details className="rounded-lg border border-border bg-background p-4">
        <summary className="cursor-pointer text-sm font-semibold">Change the settings yourself</summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <Slider label="Group size G" value={config.G ?? 8} min={2} max={16} step={1} onChange={(G) => update({ G })} hint="Answers tried per question." />
          <Slider label="Learning rate" value={config.lr ?? 0.5} min={0.05} max={3} step={0.05} onChange={(lr) => update({ lr })} format={(v) => v.toFixed(2)} hint="How big each nudge is." />
          <Slider label="KL leash β" value={config.beta ?? 0} min={0} max={0.2} step={0.01} onChange={(beta) => update({ beta })} format={(v) => v.toFixed(2)} hint="Pull back toward the start." />
        </div>
        <div className="mt-3">
          <Toggle label="Buggy reward (pays for any even number)" checked={Boolean(config.buggy)} onChange={(buggy) => update({ buggy })} />
        </div>
      </details>
    </div>
  );
}
