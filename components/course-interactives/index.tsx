"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { LessonInteractiveKey } from "@/lib/courses/interactives";

const loading = () => <div className="h-72 animate-pulse rounded-lg bg-muted" />;

const REGISTRY: Record<LessonInteractiveKey, ComponentType> = {
  "think-budget": dynamic(() => import("./ThinkBudget"), { ssr: false, loading }),
  "reward-grader": dynamic(() => import("./RewardGrader"), { ssr: false, loading }),
  "policy-nudge": dynamic(() => import("./PolicyNudge"), { ssr: false, loading }),
  "group-advantage": dynamic(() => import("./GroupAdvantage"), { ssr: false, loading }),
  "clip-explorer": dynamic(() => import("./ClipExplorer"), { ssr: false, loading }),
  "training-run": dynamic(() => import("./TrainingRun"), { ssr: false, loading }),
  "length-aha": dynamic(() => import("./LengthAha"), { ssr: false, loading }),
  "distill-compare": dynamic(() => import("./DistillCompare"), { ssr: false, loading }),
};

export function LessonInteractive({ component }: { component: string }) {
  const Interactive = REGISTRY[component as LessonInteractiveKey];
  if (!Interactive) {
    return <p className="text-sm text-muted-foreground">This interactive isn&apos;t available yet.</p>;
  }
  return <Interactive />;
}
