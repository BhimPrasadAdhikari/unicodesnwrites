"use client"

import { useState, useCallback } from "react"
import { Check, Copy } from "lucide-react"

/**
 * Copy-to-clipboard button for code blocks.
 * Shows a checkmark for 2 seconds after copying.
 */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea")
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md bg-foreground/10 text-muted-foreground backdrop-blur-sm transition-all hover:bg-foreground/20 hover:text-foreground"
      aria-label={copied ? "Copied" : "Copy code"}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}
