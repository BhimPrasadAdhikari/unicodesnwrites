import { GlyphCell, type GlyphKind } from "@/components/ui/Glyph"
import { cn } from "@/lib/utils"

interface CoverPlaceholderProps {
  kind: GlyphKind
  label?: string
  className?: string
  glyphSize?: number
}

// Fills an image slot when a post, series or product has no cover: the content type's glyph in a chart cell.
export function CoverPlaceholder({ kind, label, className, glyphSize = 72 }: CoverPlaceholderProps) {
  return <GlyphCell kind={kind} label={label} glyphSize={glyphSize} className={cn("absolute inset-0", className)} />
}
