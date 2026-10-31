"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Loader2, Play } from "lucide-react"
import { isPythonReady, runPython, type PythonStream } from "@/lib/python-runner"
import { cleanPythonError, friendlyPythonError } from "@/lib/utils/python-run"

type OutputChunk = { stream: PythonStream; text: string }

type RunState = "idle" | "preparing" | "running"

type RunOutcome =
  | { kind: "ok" }
  | { kind: "error"; message: string }
  | { kind: "timeout" }
  | { kind: "load-failed" }

/**
 * Wraps a Python code block (the rendered <pre>) with a "Run this code"
 * button and an output panel. The code runs in a Web Worker in the reader's
 * browser (see lib/python-runner.ts); nothing loads until the first click.
 */
export function RunnablePythonBlock({ code, children }: { code: string; children: ReactNode }) {
  const [state, setState] = useState<RunState>("idle")
  const [output, setOutput] = useState<OutputChunk[]>([])
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [hasRun, setHasRun] = useState(false)

  // Output can arrive line by line very quickly; collect it and render once per frame.
  const pending = useRef<OutputChunk[]>([])
  const frame = useRef<number | null>(null)

  const flushPending = useCallback(() => {
    frame.current = null
    const chunks = pending.current
    if (chunks.length === 0) return
    pending.current = []
    setOutput((previous) => {
      const next = previous.slice()
      for (const chunk of chunks) {
        const last = next[next.length - 1]
        if (last && last.stream === chunk.stream) {
          next[next.length - 1] = { stream: last.stream, text: last.text + chunk.text }
        } else {
          next.push(chunk)
        }
      }
      return next
    })
  }, [])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    []
  )

  const handleRun = useCallback(async () => {
    if (state !== "idle") return
    setHasRun(true)
    setOutput([])
    setOutcome(null)
    pending.current = []
    setState(isPythonReady() ? "running" : "preparing")

    const result = await runPython(code, {
      onStarted: () => setState("running"),
      onOutput: (stream, text) => {
        pending.current.push({ stream, text })
        if (frame.current === null) frame.current = requestAnimationFrame(flushPending)
      },
    })

    if (frame.current !== null) cancelAnimationFrame(frame.current)
    flushPending()

    if (result.status === "error") setOutcome({ kind: "error", message: friendlyPythonError(cleanPythonError(result.message)) })
    else if (result.status === "load-failed") setOutcome({ kind: "load-failed" })
    else setOutcome({ kind: result.status })
    setState("idle")
  }, [code, flushPending, state])

  const handleClear = useCallback(() => {
    pending.current = []
    setOutput([])
    setOutcome(null)
    setHasRun(false)
  }, [])

  const busy = state !== "idle"
  const label =
    state === "preparing"
      ? "Getting Python ready… (first time takes a few seconds)"
      : state === "running"
        ? "Running…"
        : "Run this code"

  return (
    <div className="my-7">
      {children}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={busy}
          aria-busy={busy}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-left font-mono text-[13px] text-foreground transition-colors hover:bg-foreground/10 disabled:cursor-wait disabled:text-muted-foreground"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{label}</span>
        </button>
      </div>

      {hasRun && (
        <div className="mt-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
              <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                Output
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md px-2 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div
              role="log"
              aria-live="polite"
              aria-label="Code output"
              className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-[13px] leading-[1.6] text-foreground"
            >
              {output.map((chunk, index) => (
                <span key={index} className={chunk.stream === "stderr" ? "text-destructive" : undefined}>
                  {chunk.text}
                </span>
              ))}
              {outcome?.kind === "ok" && output.length === 0 && (
                <span className="text-muted-foreground">Done. This code didn&apos;t print anything.</span>
              )}
              {outcome?.kind === "error" && (
                <span className="mt-2 block text-destructive first:mt-0">
                  <span className="block font-sans font-medium">This code stopped with an error:</span>
                  {outcome.message}
                </span>
              )}
              {outcome?.kind === "timeout" && (
                <span className="mt-2 block font-sans text-destructive first:mt-0">
                  This took too long and was stopped.
                </span>
              )}
              {outcome?.kind === "load-failed" && (
                <span className="mt-2 block font-sans text-destructive first:mt-0">
                  Python couldn&apos;t be loaded. Please check your internet connection and try again.
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 font-sans text-xs text-muted-foreground">
            Runs in your browser — nothing is sent to our servers.
          </p>
        </div>
      )}
    </div>
  )
}
