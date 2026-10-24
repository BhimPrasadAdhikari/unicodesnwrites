"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Delay in seconds before animation starts */
  delay?: number
  /** Direction the element slides from */
  direction?: "up" | "down" | "left" | "right" | "none"
  /** Distance in pixels for the slide */
  distance?: number
  /** Whether to animate only once */
  once?: boolean
}

const directionMap = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { y: 0, x: 1 },
  right: { y: 0, x: -1 },
  none: { y: 0, x: 0 },
}

/**
 * Scroll-triggered reveal animation.
 * Wraps any content and fades it in (with optional slide) when it enters the viewport.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 24,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: "-60px 0px" })

  const d = directionMap[direction]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: d.y * distance, x: d.x * distance }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : undefined}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered reveal container.
 * Uses CSS variables to stagger children with a delay.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px 0px" })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
