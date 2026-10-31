"use client";

import { useState } from "react";

import { softmax } from "@/lib/courses/tiny-adder";
import { Bars, ChipButton, Slider, Stat } from "./primitives";

const OPTIONS = ["Multiply first", "Subtract first", "Guess", "Draw it", "Add all", "Give up"];
const TEACHER_LOGITS = [3.2, 2.1, -0.5, 1.4, 0.2, -2];
const SHORT = OPTIONS.map((option) => option.split(" ")[0]);

function kl(p: number[], q: number[]) {
  return p.reduce((sum, pi, i) => sum + (pi > 0 ? pi * Math.log(pi / Math.max(q[i], 1e-9)) : 0), 0);
}

export default function DistillCompare() {
  const [temperature, setTemperature] = useState(1);
  const [student, setStudent] = useState<number[]>(() => new Array(OPTIONS.length).fill(0));
  const [steps, setSteps] = useState(0);
  const teacher = softmax(TEACHER_LOGITS.map((value) => value / temperature));
  const studentProbs = softmax(student);
  const best = teacher.indexOf(Math.max(...teacher));

  const train = (mode: "hard" | "soft") => {
    const target = mode === "hard" ? OPTIONS.map((_, k) => (k === best ? 1 : 0)) : teacher;
    let logits = student;
    for (let i = 0; i < 5; i += 1) {
      const p = softmax(logits);
      logits = logits.map((value, k) => value + 0.6 * (target[k] - p[k]));
    }
    setStudent(logits);
    setSteps((count) => count + 5);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6">
        A big &ldquo;teacher&rdquo; model is choosing how to start a maths problem. A small &ldquo;student&rdquo; can copy just the
        teacher&apos;s top choice (a <strong>hard label</strong>), or the teacher&apos;s whole spread of preferences (
        <strong>soft labels</strong>).
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-eyebrow text-muted-foreground">Teacher</p>
          <Bars values={teacher} labels={SHORT} highlight={[best]} max={1} format={(v) => `${Math.round(v * 100)}%`} ariaLabel="Teacher probabilities" />
        </div>
        <div>
          <p className="text-eyebrow text-muted-foreground">Student after {steps} training steps</p>
          <Bars values={studentProbs} labels={SHORT} max={1} format={(v) => `${Math.round(v * 100)}%`} ariaLabel="Student probabilities" />
        </div>
      </div>
      <Slider
        label="Temperature"
        value={temperature}
        min={0.3}
        max={4}
        step={0.1}
        onChange={setTemperature}
        format={(v) => v.toFixed(1)}
        hint="Higher temperature softens the teacher's preferences so the student sees more of the runners-up."
      />
      <div className="flex flex-wrap gap-2">
        <ChipButton onClick={() => train("hard")}>Train on hard label ×5</ChipButton>
        <ChipButton onClick={() => train("soft")}>Train on soft labels ×5</ChipButton>
        <ChipButton
          onClick={() => {
            setStudent(new Array(OPTIONS.length).fill(0));
            setSteps(0);
          }}
        >
          Reset student
        </ChipButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Gap to teacher (KL)" value={kl(teacher, studentProbs).toFixed(3)} tone="pen" />
        <Stat label="Student's top choice" value={OPTIONS[studentProbs.indexOf(Math.max(...studentProbs))]} />
      </div>
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">
        Hard labels teach only &ldquo;do this&rdquo;. Soft labels also teach &ldquo;this other way is nearly as good, and that one is
        silly&rdquo;. In practice, distilling a reasoning model usually means fine-tuning on the teacher&apos;s written-out reasoning,
        which carries even more of that know-how.
      </p>
    </div>
  );
}
