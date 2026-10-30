import type { ReactNode } from "react"

import { glyphFor, type GlyphKind } from "@/components/ui/Glyph"
import { cn } from "@/lib/utils"

/**
 * Friendly site icons for readers: simple pictures (a book, a bag, an envelope) drawn with the
 * logo's pen — one stroke, round caps, 48-unit cell — plus one small red-pen detail each.
 * The math glyphs in Glyph.tsx stay for the admin studio; the public site uses these.
 */
export type SiteIconKind = "articles" | "courses" | "projects" | "shop" | "newsletter" | "about" | "search" | "learning"

type IconArt = { name: string; ink: ReactNode; accent: ReactNode }

export const SITE_ICONS: Record<SiteIconKind, IconArt> = {
  // An open book; the red line is the sentence you are reading.
  articles: {
    name: "Articles",
    ink: (
      <>
        <path d="M24 15.5c-4-3-9-3.6-14.5-2.6v22c5.5-1 10.5-.4 14.5 2.6 4-3 9-3.6 14.5-2.6v-22c-5.5-1-10.5-.4-14.5 2.6z" />
        <path d="M24 15.5v22" />
        <path d="M14.5 21.5h5" />
      </>
    ),
    accent: <path d="M28.5 21.5h5" />,
  },
  // A little screen on a stand; the red play button starts the lesson.
  courses: {
    name: "Courses",
    ink: (
      <>
        <rect x="8" y="10" width="32" height="23" rx="4" />
        <path d="M24 33v5.5M17.5 38.5h13" />
      </>
    ),
    accent: <path d="M21 17v9.5l7.5-4.75z" />,
  },
  // Three building blocks stacked up; the red stud on top is the newest piece.
  projects: {
    name: "Projects",
    ink: (
      <>
        <rect x="8.5" y="27" width="14" height="11" rx="2" />
        <rect x="25.5" y="27" width="14" height="11" rx="2" />
        <rect x="17" y="13" width="14" height="11" rx="2" />
      </>
    ),
    accent: <path d="M21.5 9.5h5" />,
  },
  // A shopping bag with a red smile.
  shop: {
    name: "Shop",
    ink: (
      <>
        <path d="M11.5 17.5h25l-2 20.5h-21z" />
        <path d="M18.5 17.5v-3a5.5 5.5 0 0 1 11 0v3" />
      </>
    ),
    accent: <path d="M19.5 25.5a4.5 4.5 0 0 0 9 0" />,
  },
  // An envelope with a red "new" dot in the corner.
  newsletter: {
    name: "Newsletter",
    ink: (
      <>
        <rect x="7.5" y="15" width="29" height="21" rx="3" />
        <path d="M9 17.5l13.5 9.5 13.5-9.5" />
      </>
    ),
    accent: <circle cx="40.5" cy="10" r="2" fill="currentColor" />,
  },
  // A head and shoulders with a red smile.
  about: {
    name: "About",
    ink: (
      <>
        <circle cx="24" cy="16" r="8" />
        <path d="M10 39.5c1.4-7.6 7-11.5 14-11.5s12.6 3.9 14 11.5" />
      </>
    ),
    accent: <path d="M20.6 17.6a3.9 3.9 0 0 0 6.8 0" />,
  },
  // A magnifying glass; the red stroke is the glint on the lens.
  search: {
    name: "Search",
    ink: (
      <>
        <circle cx="21" cy="21" r="11" />
        <path d="M29 29l9.5 9.5" />
      </>
    ),
    accent: <path d="M15.5 19.5a6 6 0 0 1 4-4" />,
  },
  // Steps going up, with a red flag at the top.
  learning: {
    name: "Learning path",
    ink: (
      <>
        <path d="M7.5 39h8v-7h8v-7h8v-7h8.5" />
        <path d="M35.5 18V8.5" />
      </>
    ),
    accent: <path d="M35.5 8.5l5.5 2.6-5.5 2.6z" fill="currentColor" />,
  },
}

interface SiteIconProps {
  kind: SiteIconKind
  size?: number
  className?: string
  /** Stroke in 48-unit cell space; defaults scale with size (like Glyph) so small icons stay clear */
  strokeWidth?: number
  title?: string
  /** Draw the red-pen detail in red (default). Turn off on red backgrounds. */
  accent?: boolean
}

export function SiteIcon({ kind, size = 24, className, strokeWidth, title, accent = true }: SiteIconProps) {
  const icon = SITE_ICONS[kind]
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
      {icon.ink}
      <g stroke="currentColor" className={accent ? "text-primary" : undefined}>
        {icon.accent}
      </g>
    </svg>
  )
}

/** Plain names for the site's content types, for labels and filter tabs readers see. */
export const PLAIN_TOPIC: Record<GlyphKind, string> = {
  papers: "Research explained",
  agents: "AI agents",
  builds: "Projects",
  courses: "Lessons",
  tools: "Guides & kits",
  letters: "Newsletter",
}

const ICON_FOR_GLYPH: Record<GlyphKind, SiteIconKind> = {
  papers: "articles",
  agents: "articles",
  builds: "projects",
  courses: "courses",
  tools: "shop",
  letters: "newsletter",
}

export function iconForGlyph(kind: GlyphKind): SiteIconKind {
  return ICON_FOR_GLYPH[kind]
}

/** Map a category, post type or product type onto a friendly icon. */
export function siteIconFor(input?: string | null): SiteIconKind {
  return ICON_FOR_GLYPH[glyphFor(input)]
}

interface SiteIconCellProps {
  kind: SiteIconKind
  className?: string
  iconSize?: number
  /** Small plain-words tag in the top-left corner; false hides it */
  label?: string | false
}

/** A friendly cover: the paper dot-grid with the icon in the middle and an optional plain label. */
export function SiteIconCell({ kind, className, iconSize = 64, label }: SiteIconCellProps) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-card text-foreground dot-grid", className)} aria-hidden="true">
      {label ? (
        <span className="absolute left-3 top-2.5 font-mono text-[11px] tracking-[0.04em] text-muted-foreground">{label}</span>
      ) : null}
      <SiteIcon kind={kind} size={iconSize} />
    </div>
  )
}
