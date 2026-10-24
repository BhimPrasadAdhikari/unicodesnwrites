import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Codepoint chip: mono caps on a 6px tag. Status variants are tinted (10% fill, 20% border,
// full-strength text) so they read in both themes.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-foreground text-background",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-primary/20 bg-primary/10 text-primary",
        accent: "border-accent/20 bg-accent/10 text-accent",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/20 bg-warning/10 text-warning",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        // Legacy names kept so existing call sites keep working
        blue: "border-primary/20 bg-primary/10 text-primary",
        indigo: "border-primary/20 bg-primary/10 text-primary",
        cyan: "border-accent/20 bg-accent/10 text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
