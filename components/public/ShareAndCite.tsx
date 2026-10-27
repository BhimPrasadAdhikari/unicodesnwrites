"use client"

import { useState } from "react"
import { Check, Copy, Link2, Share2 } from "lucide-react"

interface ShareAndCiteProps {
  url: string
  title: string
  author: string
  /** ISO date the post was published */
  publishedAt?: string
  slug: string
  /** Where readers send questions and corrections */
  replyEmail?: string
}

/** BibTeX keys can't hold most punctuation; keep letters, digits and dashes. */
function bibKey(author: string, year: string, slug: string) {
  const surname = author.split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, "") || "author"
  return `${surname}${year}${slug.split("-").slice(0, 3).join("")}`
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * End-of-post tools: share to the places technical readers gather, and a
 * ready-to-paste citation (BibTeX and plain text) for anyone writing a paper.
 */
export default function ShareAndCite({ url, title, author, publishedAt, slug, replyEmail }: ShareAndCiteProps) {
  const [copied, setCopied] = useState<"link" | "bibtex" | "plain" | null>(null)
  const date = publishedAt ? new Date(publishedAt) : null
  const year = date ? String(date.getUTCFullYear()) : "n.d."
  const month = date ? date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) : ""

  const bibtex = `@article{${bibKey(author, year, slug)},
  title   = {${title.replace(/[{}]/g, "")}},
  author  = {${author}},
  journal = {unicodesnwrites.tech},
  year    = {${year}},${month ? `\n  month   = {${month}},` : ""}
  url     = {${url}}
}`
  const plain = `${author} (${year}). ${title}. unicodesnwrites. ${url}`

  const flash = async (kind: "link" | "bibtex" | "plain", text: string) => {
    if (await copyText(text)) {
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // dismissed: fall through to copying
      }
    }
    flash("link", url)
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const targets = [
    { label: "X", href: `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "Hacker News", href: `https://news.ycombinator.com/submitlink?u=${encodedUrl}&t=${encodedTitle}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
  ]

  const chip =
    "inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"

  return (
    <section aria-labelledby="share-cite-heading" className="mt-12 border-t border-border pt-8">
      <h2 id="share-cite-heading" className="text-eyebrow text-muted-foreground">Share &amp; cite</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={share} className={chip}>
          <Share2 className="h-4 w-4" aria-hidden="true" /> Share
        </button>
        <button type="button" onClick={() => flash("link", url)} className={chip}>
          {copied === "link" ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          {copied === "link" ? "Link copied" : "Copy link"}
        </button>
        {targets.map((target) => (
          <a key={target.label} href={target.href} target="_blank" rel="noopener noreferrer" className={chip}>
            {target.label}
          </a>
        ))}
      </div>

      {replyEmail ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Spotted a mistake or have a question?{" "}
          <a
            href={`mailto:${replyEmail}?subject=${encodeURIComponent(`Re: ${title}`)}`}
            className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4"
          >
            Reply by email
          </a>
          ; I read every one and fix posts when readers catch something.
        </p>
      ) : null}

      <details className="group mt-5 rounded-xl border border-border bg-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
          Cite this post
          <span className="font-mono text-[12px] text-muted-foreground group-open:hidden">BibTeX · plain</span>
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">BibTeX</span>
              <button type="button" onClick={() => flash("bibtex", bibtex)} className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                {copied === "bibtex" ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                {copied === "bibtex" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-secondary p-3 font-mono text-[12.5px] leading-relaxed text-foreground">{bibtex}</pre>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">Plain text</span>
              <button type="button" onClick={() => flash("plain", plain)} className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                {copied === "plain" ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                {copied === "plain" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="rounded-lg bg-secondary p-3 text-sm leading-relaxed text-foreground">{plain}</p>
          </div>
        </div>
      </details>
    </section>
  )
}
