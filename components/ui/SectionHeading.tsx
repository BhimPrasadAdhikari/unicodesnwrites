import Link from "next/link"

import { SiteIcon, type SiteIconKind } from "@/components/ui/SiteIcon"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  eyebrow: string
  title: React.ReactNode
  description?: React.ReactNode
  href?: string
  linkLabel?: string
  className?: string
  /** Use "h1" when the heading opens a page */
  as?: "h1" | "h2"
  /** Optional friendly icon shown beside the eyebrow */
  icon?: SiteIconKind
}

/** Section head: red mono eyebrow (with an optional icon), serif title, optional underlined "see all" link. */
export function SectionHeading({ eyebrow, title, description, href, linkLabel, className, as: Tag = "h2", icon }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="flex max-w-2xl flex-col gap-2.5">
        <p className="flex items-center gap-2 text-eyebrow text-primary">
          {icon ? <SiteIcon kind={icon} size={22} className="text-foreground" /> : null}
          {eyebrow}
        </p>
        <Tag className={cn("font-serif font-medium tracking-[-0.02em] text-foreground", Tag === "h1" ? "text-title" : "text-[clamp(1.875rem,4vw,3rem)] leading-[1.08]")}>
          {title}
        </Tag>
        {description ? <p className="mt-1 text-base leading-7 text-muted-foreground">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center text-[15px] font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  )
}
