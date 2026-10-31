import Link from "next/link"

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/Button"
import { StatusPage } from "@/components/ui/StatusPage"

export default function NotFound() {
  return (
    <StatusPage
      label="404 · PAGE NOT FOUND"
      title={<>This page was <span className="line-through decoration-primary decoration-[3px]">here</span>.</>}
      description="We couldn't find this page. The link may be old, or the page may have moved. Try one of these instead."
      actions={
        <>
          <Button size="lg" asChild><Link href="/">Back to home</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/blog">Read the articles</Link></Button>
        </>
      }
    />
  )
}
