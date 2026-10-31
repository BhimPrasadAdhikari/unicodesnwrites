"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const INK = "hsl(var(--foreground))";
export const PEN = "hsl(var(--primary))";
export const MUTED = "hsl(var(--muted-foreground))";
export const GOOD = "hsl(var(--success))";
export const GRID = "hsl(var(--border))";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => String(v),
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
  format?(value: number): string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm tabular-nums text-primary">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[hsl(var(--primary))]"
      />
      {hint && <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange(value: boolean): void }) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[hsl(var(--primary))]"
      />
      {label}
    </label>
  );
}

export function ChipButton({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-10 rounded-lg border px-3 text-sm font-semibold transition",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-primary/60",
      )}
    >
      {children}
    </button>
  );
}

export function Illustrative({ children = "Illustrative shape, not measured data" }: { children?: ReactNode }) {
  return (
    <p className="mt-3 inline-flex rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "pen" | "good" }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-eyebrow text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-lg tabular-nums", tone === "pen" && "text-primary", tone === "good" && "text-success")}>
        {value}
      </p>
    </div>
  );
}

export type Series = { label: string; color: string; points: number[]; dashed?: boolean };

/** A small responsive SVG line chart. Points are evenly spaced on x. */
export function LineChart({
  series,
  yMin = 0,
  yMax = 1,
  xMax,
  height = 220,
  xLabel,
  yLabel,
  markers = [],
  ariaLabel,
}: {
  series: Series[];
  yMin?: number;
  yMax?: number;
  xMax?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  markers?: Array<{ x: number; label: string }>;
  ariaLabel: string;
}) {
  const width = 640;
  const pad = { left: 44, right: 12, top: 12, bottom: 34 };
  const count = xMax ?? Math.max(1, ...series.map((item) => item.points.length - 1));
  const x = (i: number) => pad.left + (i / count) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (height - pad.top - pad.bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * (yMax - yMin));

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
            <text x={pad.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={11} fill={MUTED} className="font-mono">
              {Number.isInteger(tick) ? tick : tick.toFixed(2)}
            </text>
          </g>
        ))}
        {markers.map((marker) => (
          <g key={marker.label}>
            <line x1={x(marker.x)} x2={x(marker.x)} y1={pad.top} y2={height - pad.bottom} stroke={PEN} strokeDasharray="4 4" />
            <text x={x(marker.x) + 6} y={pad.top + 12} fontSize={12} fill={PEN} fontWeight={600}>
              {marker.label}
            </text>
          </g>
        ))}
        {series.map((item) =>
          item.points.length > 1 ? (
            <polyline
              key={item.label}
              fill="none"
              stroke={item.color}
              strokeWidth={2.25}
              strokeDasharray={item.dashed ? "6 5" : undefined}
              strokeLinejoin="round"
              points={item.points.map((v, i) => `${x(i).toFixed(1)},${y(Math.min(yMax, Math.max(yMin, v))).toFixed(1)}`).join(" ")}
            />
          ) : null,
        )}
        {xLabel && (
          <text x={(width + pad.left) / 2} y={height - 6} textAnchor="middle" fontSize={12} fill={MUTED}>
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={12} y={height / 2} textAnchor="middle" fontSize={12} fill={MUTED} transform={`rotate(-90 12 ${height / 2})`}>
            {yLabel}
          </text>
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Vertical bars with optional highlighted indices and value labels. */
export function Bars({
  values,
  labels,
  highlight = [],
  max = Math.max(1e-9, ...values.map(Math.abs)),
  signed = false,
  height = 180,
  format = (v: number) => v.toFixed(2),
  ariaLabel,
}: {
  values: number[];
  labels: string[];
  highlight?: number[];
  max?: number;
  signed?: boolean;
  height?: number;
  format?(v: number): string;
  ariaLabel: string;
}) {
  const width = 640;
  const pad = { top: 18, bottom: 26 };
  const slot = width / values.length;
  const barWidth = Math.min(56, slot * 0.66);
  const plot = height - pad.top - pad.bottom;
  const zero = signed ? pad.top + plot / 2 : pad.top + plot;
  const scale = signed ? plot / 2 / max : plot / max;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      <line x1={0} x2={width} y1={zero} y2={zero} stroke={GRID} />
      {values.map((value, i) => {
        const h = Math.abs(value) * scale;
        const top = value >= 0 ? zero - h : zero;
        const cx = slot * i + slot / 2;
        const color = highlight.includes(i) ? PEN : signed && value < 0 ? MUTED : INK;
        return (
          <g key={i}>
            <rect x={cx - barWidth / 2} y={top} width={barWidth} height={Math.max(h, 1)} rx={3} fill={color} opacity={highlight.length && !highlight.includes(i) ? 0.55 : 1}>
              <title>{`${labels[i]}: ${format(value)}`}</title>
            </rect>
            {values.length <= 12 && (
              <text x={cx} y={value >= 0 ? top - 5 : top + h + 13} textAnchor="middle" fontSize={11} fill={MUTED} className="font-mono">
                {format(value)}
              </text>
            )}
            <text x={cx} y={height - 8} textAnchor="middle" fontSize={values.length > 12 ? 9 : 11} fill={MUTED}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
