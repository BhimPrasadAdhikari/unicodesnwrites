import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** "display" = serif headline for landing/index pages, "title" = sans for detail pages */
  tone?: "display" | "title"
  action?: ReactNode
  className?: string
}

// Public page heading: eyebrow → headline → lede, with an optional aside on wide screens.
export function PageHeader({ eyebrow, title, description, tone = "display", action, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-4xl">
        {eyebrow ? <p className="text-eyebrow text-primary">{eyebrow}</p> : null}
        <h1 className={cn("mt-5 text-foreground", tone === "display" ? "text-display" : "text-title")}>{title}</h1>
        {description ? <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
