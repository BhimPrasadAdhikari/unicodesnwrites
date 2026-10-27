import { cn } from "@/lib/utils"

/**
 * Codepoint glyphs: each content type is a Unicode character, redrawn with the logo's pen
 * (one stroke, round caps) so it renders identically everywhere instead of falling back to
 * whatever font happens to have ∂ or ⊕. Use the glyph as the cover, the icon and the filter.
 */
export type GlyphKind = "papers" | "agents" | "builds" | "courses" | "tools" | "letters"

export const GLYPHS: Record<GlyphKind, { name: string; code: string; char: string; d: string; circle?: boolean }> = {
  papers: { name: "Papers", code: "U+2202", char: "∂", d: "M15 14c3-4.5 12-5 15.5 1.5 4 7.5 1.5 21-8 22.5-5.5.8-9.5-2.6-9.5-7.6 0-5.2 4-8.4 8.8-8.4 4.4 0 8 2.8 9.2 7" },
  agents: { name: "Agents", code: "U+03BB", char: "λ", d: "M13 10c5 0 7.5 2.5 9.5 7.5L35 38M23.5 20 13 38" },
  builds: { name: "Build logs", code: "U+2207", char: "∇", d: "M10 13h28L24 37z" },
  courses: { name: "Courses", code: "U+03A3", char: "Σ", d: "M34 12H14l12 12-12 12h20" },
  tools: { name: "Tools", code: "U+2295", char: "⊕", d: "M24 11v26M11 24h26", circle: true },
  letters: { name: "Letters", code: "U+00B6", char: "¶", d: "M27 12v26M33 12v26M36 12H21.5c-5 0-8.5 3.4-8.5 8.2s3.5 8.3 8.5 8.3H27" },
}

interface GlyphProps {
  kind: GlyphKind
  size?: number
  className?: string
  /** Stroke in 48-unit cell space; defaults scale with size so small glyphs stay legible */
  strokeWidth?: number
  title?: string
}

export function Glyph({ kind, size = 24, className, strokeWidth, title }: GlyphProps) {
  const g = GLYPHS[kind]
  const sw = strokeWidth ?? (size >= 70 ? 2.6 : size >= 36 ? 3.2 : 3.8)
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {g.circle ? <circle cx="24" cy="24" r="13" /> : null}
      <path d={g.d} />
    </svg>
  )
}

/** Map the site's categories, post types and product types onto a glyph */
export function glyphFor(input?: string | null): GlyphKind {
  const v = (input || "").toLowerCase()
  if (/(paper|research|theory|dissect|math|foundation|deep learning)/.test(v)) return "papers"
  if (/(agent|mcp|llm|tool[- ]?call|protocol|react)/.test(v)) return "agents"
  if (/(course|lesson|learn)/.test(v)) return "courses"
  if (/(product|template|kit|book|e-?book|code|tool)/.test(v)) return "tools"
  if (/(letter|newsletter|issue)/.test(v)) return "letters"
  return "builds"
}

interface GlyphCellProps {
  kind: GlyphKind
  className?: string
  glyphSize?: number
  label?: string | false
  dot?: boolean
}

/** A Unicode chart cell: dot-grid ground, codepoint top left, the glyph centred, a red ink dot. */
export function GlyphCell({ kind, className, glyphSize = 64, label, dot = true }: GlyphCellProps) {
  const g = GLYPHS[kind]
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-card text-foreground dot-grid", className)} aria-hidden="true">
      {label !== false ? (
        <span className="absolute left-3 top-2.5 font-mono text-[11px] tracking-[0.04em] text-muted-foreground">{label ?? g.code}</span>
      ) : null}
      <Glyph kind={kind} size={glyphSize} />
      {dot ? <span className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-[hsl(var(--ink-dot))]" /> : null}
    </div>
  )
}
