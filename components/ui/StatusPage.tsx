import Link from "next/link"
import type { ReactNode } from "react"

import { Lockup } from "@/components/ui/Logo"

/** U+FFFD, the replacement character: what a renderer draws when a codepoint can't be shown. */
function ReplacementGlyph() {
  return (
    <svg viewBox="0 0 48 48" width="112" height="112" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M24 5 43 24 24 43 5 24Z" className="fill-foreground" />
      <path d="M19.5 19.5c0-2.6 2-4.5 4.6-4.5s4.4 1.8 4.4 4.2c0 3.6-4.5 3.9-4.5 7.6" className="stroke-background" strokeWidth="3.2" />
      <circle cx="24" cy="32.5" r="2" className="fill-background" />
    </svg>
  )
}

interface StatusPageProps {
  label: string
  title: ReactNode
  description: ReactNode
  actions: ReactNode
  footnote?: ReactNode
}

/** Shared layout for 404 and error boundaries: the replacement glyph, a struck-through note, two ways out. */
export function StatusPage({ label, title, description, actions, footnote }: StatusPageProps) {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl px-6 py-3.5 md:px-8">
          <Link href="/" aria-label="unicodesnwrites home"><Lockup size={30} /></Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-6 py-16 md:flex-row md:items-center md:gap-14 md:px-8">
        <div className="dot-grid relative flex h-[180px] w-[180px] shrink-0 items-center justify-center rounded-3xl border border-border bg-card">
          <ReplacementGlyph />
          <span className="absolute bottom-3.5 right-3.5 h-2 w-2 rounded-full bg-[hsl(var(--ink-dot))]" />
        </div>
        <div className="max-w-xl">
          <p className="font-mono text-[12px] tracking-[0.08em] text-primary">{label}</p>
          <h1 className="mt-3 font-serif text-[clamp(2.25rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.025em]">{title}</h1>
          <p className="mt-4 text-[17px] leading-[1.6] text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
          {footnote ? <div className="mt-8 text-xs text-muted-foreground">{footnote}</div> : null}
        </div>
      </div>
    </main>
  )
}
