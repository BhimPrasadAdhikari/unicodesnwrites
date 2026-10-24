import * as React from "react"
import { cn } from "@/lib/utils"

type SectionProps = React.HTMLAttributes<HTMLElement>

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, ...props }, ref) => (
    <section
      ref={ref}
      className={cn("py-16 md:py-24", className)}
      {...props}
    />
  )
)
Section.displayName = "Section"

type ContainerProps = React.HTMLAttributes<HTMLDivElement>

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mx-auto w-full max-w-6xl px-6 md:px-8", className)}
      {...props}
    />
  )
)
Container.displayName = "Container"

export { Section, Container }
