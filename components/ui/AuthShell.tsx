import Link from "next/link"
import type { ReactNode } from "react"

import { Lockup } from "@/components/ui/Logo"
import { Glyph } from "@/components/ui/Glyph"

interface AuthShellProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Small link above the card, e.g. back to sign in */
  back?: { href: string; label: string }
}

/**
 * Codepoint account pages: the notebook's cover on the left (wide screens only),
 * the form on a sheet on the right. One column and no cover on a phone.
 */
export function AuthShell({ eyebrow, title, description, children, back }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="dot-grid hidden flex-col border-r border-border px-12 py-12 lg:flex xl:px-20">
          <Link href="/" className="w-fit" aria-label="unicodesnwrites home">
            <Lockup />
          </Link>
          <div className="my-auto max-w-xl py-16">
            <p className="text-eyebrow text-primary">Student &amp; member portal</p>
            <p className="mt-5 font-serif text-[clamp(3rem,5vw,4.5rem)] font-medium leading-[0.98] tracking-[-0.03em]">
              Master AI engineering from <span className="hl">first principles</span>.
            </p>
            <p className="mt-6 max-w-md text-lg leading-[1.6] text-muted-foreground">
              Your enrolled courses, lecture notebook and learning progress across LLMs, autonomous agents and production AI systems.
            </p>
            <div className="mt-10 flex gap-5 text-foreground/80">
              <Glyph kind="papers" size={30} />
              <Glyph kind="agents" size={30} />
              <Glyph kind="courses" size={30} />
              <Glyph kind="tools" size={30} />
            </div>
          </div>
          <p className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">VERIFIED ACCOUNTS · SECURE COURSE ACCESS</p>
        </section>

        <section className="flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:justify-center lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" aria-label="unicodesnwrites home" className="mb-10 inline-flex lg:hidden">
              <Lockup size={30} />
            </Link>
            {back ? (
              <div>
                <Link href={back.href} className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground">
                  ← {back.label}
                </Link>
              </div>
            ) : null}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              {eyebrow ? <p className="mb-2 text-eyebrow text-primary">{eyebrow}</p> : null}
              <h1 className="font-serif text-[32px] font-medium leading-[1.1] tracking-[-0.02em]">{title}</h1>
              {description ? <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">{description}</p> : null}
              <div className="mt-7">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
