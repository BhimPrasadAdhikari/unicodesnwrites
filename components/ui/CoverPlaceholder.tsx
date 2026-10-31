import { SiteIconCell, type SiteIconKind } from "@/components/ui/SiteIcon"
import { cn } from "@/lib/utils"

interface CoverPlaceholderProps {
  kind: SiteIconKind
  label?: string
  className?: string
  iconSize?: number
}

// Fills an image slot when a post, series or product has no cover: a friendly icon on the paper dot-grid.
export function CoverPlaceholder({ kind, label, className, iconSize = 72 }: CoverPlaceholderProps) {
  return <SiteIconCell kind={kind} label={label} iconSize={iconSize} className={cn("absolute inset-0", className)} />
}
