import { cn } from "@/lib/utils"

interface MarkProps {
  size?: number
  className?: string
  /** Show the U+0075 codepoint label inside the tile (only legible from ~48px up) */
  codepoint?: boolean
  title?: string
}

/**
 * The unicodesnwrites mark: a lowercase u drawn in one stroke inside a Unicode chart cell.
 * The right stem keeps going past the baseline and leaves a red ink dot — the character that writes.
 * Ink/paper follow the theme (tile = foreground, stroke = background); the dot is always red.
 */
export function Mark({ size = 32, className, codepoint = size >= 48, title }: MarkProps) {
  const small = size < 24
  const stroke = small ? 9 : size < 40 ? 7 : 6
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="64" height="64" rx="14" className="fill-foreground" />
      {codepoint && !small ? (
        <text x="9" y="15" fontSize="6.5" className="fill-background font-mono" fillOpacity={0.55}>
          U+0075
        </text>
      ) : null}
      <path d="M21 22v15a11 11 0 0 0 22 0V22" fill="none" strokeWidth={stroke} strokeLinecap="round" className="stroke-background" />
      {small ? null : (
        <>
          <path d="M43 37v12" strokeWidth={stroke} strokeLinecap="round" className="stroke-background" />
          <circle cx="43" cy="56" r={stroke / 2} fill="hsl(var(--ink-dot))" />
        </>
      )}
    </svg>
  )
}

/** "unicodes n writes" — the italic red n stands for "and". */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-sans font-semibold tracking-[-0.02em] whitespace-nowrap", className)}>
      unicodes <i className="font-serif font-medium text-primary">n</i> writes
    </span>
  )
}

export function Lockup({ size = 34, className, wordmarkClassName }: { size?: number; className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={size} />
      <Wordmark className={cn("text-[17px]", wordmarkClassName)} />
    </span>
  )
}
