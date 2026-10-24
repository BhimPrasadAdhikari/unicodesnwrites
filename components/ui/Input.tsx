import * as React from "react"

import { cn } from "@/lib/utils"

// Shared by Input, Textarea and Select so every text field looks and focuses the same
export const fieldClasses =
  "flex w-full rounded-lg border border-input bg-card px-4 py-2 text-[15px] ring-offset-background placeholder:text-muted-foreground transition-colors duration-200 hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30 disabled:cursor-not-allowed disabled:opacity-50"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          fieldClasses,
          "h-11 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClasses, "min-h-24 py-3 leading-6", className)} {...props} />
  )
)
Textarea.displayName = "Textarea"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldClasses, "h-11 pr-8", className)} {...props} />
  )
)
Select.displayName = "Select"

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

function Label({ className, ...props }: LabelProps) {
  return <label className={cn("text-sm font-medium text-foreground", className)} {...props} />
}

function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p role="alert" className={cn("mt-1.5 text-xs text-destructive", className)} {...props} />
}

export { Textarea, Select, Label, FieldError }
