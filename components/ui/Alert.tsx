import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Inline feedback box (form results, load errors, warnings). Same tint recipe as Badge.
const alertVariants = cva("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-primary/20 bg-primary/10 text-primary",
      success: "border-success/20 bg-success/10 text-success",
      warning: "border-warning/20 bg-warning/10 text-warning",
      destructive: "border-destructive/20 bg-destructive/10 text-destructive",
      neutral: "border-border bg-muted/50 text-foreground",
    },
  },
  defaultVariants: { variant: "info" },
})

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, role, ...props }: AlertProps) {
  return (
    <div
      role={role ?? (variant === "destructive" ? "alert" : "status")}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Alert, alertVariants }
