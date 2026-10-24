"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils"
import { subscribeSchema } from '@/lib/utils/validations/newsletter'

interface NewsletterSignupInlineProps {
  source?: 'footer' | 'blog-post-inline' | 'homepage';
  /** "inverse" sits on an ink panel */
  tone?: 'default' | 'inverse';
}

export function NewsletterSignupInline({ source = 'footer', tone = 'default' }: NewsletterSignupInlineProps) {
  const inverse = tone === 'inverse'
  const [sentTo, setSentTo] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = subscribeSchema.safeParse({ email, source })
    if (!validation.success) {
      setMessage({ text: validation.error.issues[0]?.message || 'Enter a valid email address.', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.message || payload?.error || 'Subscription failed')

      setSentTo(validation.data.email)
      setMessage({ text: 'Check your inbox', type: 'success' })
      setEmail("")
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Something went wrong. Try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (message?.type === 'success') {
    return (
      <div role="status" className={cn("w-full max-w-md rounded-xl border px-5 py-4", inverse ? "border-background/20" : "border-border bg-card")}>
        <p className="font-mono text-[12px] tracking-[0.08em] text-[hsl(var(--ink-dot))]">CHECK YOUR INBOX</p>
        <p className="mt-1.5 font-serif text-xl leading-snug">A confirmation link is on its way to {sentTo || 'you'}.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            aria-invalid={message?.type === 'error'}
            className={cn("h-12 text-base", inverse && "border-background/25 bg-transparent text-background placeholder:text-background/50")}
          />
        </label>
        <Button type="submit" variant="primary" disabled={loading} className="h-12 px-6">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Subscribe'}
        </Button>
      </form>
      {message?.type === 'error' ? (
        <p role="alert" className={cn("mt-3 text-sm", inverse ? "text-[hsl(var(--ink-dot))]" : "text-destructive")}>{message.text}</p>
      ) : (
        <p className={cn("mt-3 text-[13px]", inverse ? "text-background/60" : "text-muted-foreground")}>We&apos;ll send one email to confirm. Nothing else until you do.</p>
      )}
    </div>
  )
}
