"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/Button"
import { StatusPage } from "@/components/ui/StatusPage"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an analytics service
    console.error(error)
  }, [error])

  return (
    <StatusPage
      label="ERROR · SOMETHING BROKE"
      title="Something went wrong on our side."
      description="Try again, or come back in a minute."
      actions={
        <>
          <Button size="lg" onClick={reset}>Try again</Button>
          <Button size="lg" variant="outline" asChild><Link href="/">Back to home</Link></Button>
        </>
      }
      footnote={error.digest ? <>Error ID: <span className="font-mono">{error.digest}</span></> : null}
    />
  )
}
