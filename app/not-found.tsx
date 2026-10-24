import Link from "next/link"

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/Button"
import { StatusPage } from "@/components/ui/StatusPage"

export default function NotFound() {
  return (
    <StatusPage
      label="404 · PAGE NOT FOUND"
      title={<>This page was <span className="line-through decoration-primary decoration-[3px]">here</span>.</>}
      description="It was struck from the notebook: the link may be old, or the page moved. Here is where to pick up again."
      actions={
        <>
          <Button size="lg" asChild><Link href="/">Back to home</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/blog">Browse the writing</Link></Button>
        </>
      }
    />
  )
}
