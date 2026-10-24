"use client"

import { useEffect, useState } from "react"
import { motion, useScroll, useSpring } from "framer-motion"

/**
 * Ultra-thin scroll progress indicator at the very top of the viewport.
 * Appears only after the user starts scrolling.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      setVisible(v > 0.01)
    })
    return unsubscribe
  }, [scrollYProgress])

  if (!visible) return null

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-foreground/60"
      style={{ scaleX }}
    />
  )
}
